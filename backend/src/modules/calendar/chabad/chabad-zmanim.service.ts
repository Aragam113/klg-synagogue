import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { safeFetch } from '../../content/telegram/safe-fetch';
import { addDays, kaliningradDate } from '../kaliningrad-time';
import {
  CHABAD_BUDGET_MS,
  CHABAD_CACHE_DAYS,
  CHABAD_LOCATION_ID,
  CHABAD_WARM_DAYS,
} from '../calendar.config';
import {
  ChabadDay,
  chabadDateParam,
  parseChabadZmanim,
} from './chabad-zmanim.parser';

const HOST = 'www.chabad.org';
const UA = 'KlgSynagogue-site/1.0';
const DAY_MS = 86_400_000;
/** Сколько одновременных запросов к Chabad.org. */
const CONCURRENCY = 4;
/** После ошибки дату не запрашиваем столько времени. */
const RETRY_AFTER_MS = 10 * 60_000;
const WARM_EVERY_MS = 6 * 60 * 60_000;

export function chabadZmanimUrl(date: string): string {
  return (
    `https://${HOST}/tools/rss/zmanim.xml?locationid=${CHABAD_LOCATION_ID}` +
    `&locationtype=1&tdate=${chabadDateParam(date)}`
  );
}

interface Cached {
  day: ChabadDay;
  /** Когда получено (мс). */
  at: number;
}

/**
 * Зманим, свечи и исход Шаббата/праздника с Chabad.org (RSS zmanim.xml, город 908 — Калининград).
 *
 * Запрос страницы календаря не ждёт Chabad.org дольше CHABAD_BUDGET_MS: что не успело —
 * считается локально (@hebcal/core) и догружается в фоне. Кэш — в памяти и в JSON-файле
 * (CHABAD_CACHE_FILE, по умолчанию backend/.cache/chabad-zmanim.json), прогрев на старте
 * и каждые 6 часов. CHABAD_ZMANIM=off — только локальный расчёт (тесты, офлайн).
 */
@Injectable()
export class ChabadZmanimService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly log = new Logger('ChabadZmanim');
  private readonly cache = new Map<string, Cached>();
  private readonly failedAt = new Map<string, number>();
  private readonly inflight = new Map<string, Promise<void>>();
  private readonly waiting: (() => void)[] = [];
  private active = 0;
  private timer?: NodeJS.Timeout;
  private saveTimer?: NodeJS.Timeout;

  /** Подменяется в тестах. */
  fetchImpl: typeof fetch = (...args) => fetch(...args);
  readonly enabled = process.env.CHABAD_ZMANIM !== 'off';
  private readonly file =
    process.env.CHABAD_CACHE_FILE ||
    path.join(process.cwd(), '.cache', 'chabad-zmanim.json');

  async onApplicationBootstrap(): Promise<void> {
    if (!this.enabled || process.env.NODE_ENV === 'test') return;
    await this.load();
    void this.warm();
    this.timer = setInterval(() => void this.warm(), WARM_EVERY_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.saveTimer) clearTimeout(this.saveTimer);
  }

  /** Прогрев: сегодня и CHABAD_WARM_DAYS дней вперёд. */
  async warm(now = new Date()): Promise<void> {
    const today = kaliningradDate(now);
    const dates = Array.from({ length: CHABAD_WARM_DAYS }, (_, i) =>
      addDays(today, i)
    );
    await Promise.all(dates.map((d) => this.ensure(d)));
  }

  /**
   * Дни с Chabad.org, которые удалось получить за `budgetMs`. Остальные догружаются в фоне.
   */
  async getDays(
    dates: string[],
    budgetMs = CHABAD_BUDGET_MS
  ): Promise<Map<string, ChabadDay>> {
    const out = new Map<string, ChabadDay>();
    if (!this.enabled) return out;
    const missing = dates.filter((d) => !this.fresh(d));
    if (missing.length) {
      const all = Promise.all(missing.map((d) => this.ensure(d)));
      let timeout: NodeJS.Timeout | undefined;
      await Promise.race([
        all,
        new Promise<void>((r) => (timeout = setTimeout(r, budgetMs))),
      ]);
      clearTimeout(timeout);
    }
    for (const d of dates) {
      const hit = this.cache.get(d);
      if (hit) out.set(d, hit.day);
    }
    return out;
  }

  private fresh(date: string): boolean {
    const hit = this.cache.get(date);
    return !!hit && Date.now() - hit.at < CHABAD_CACHE_DAYS * DAY_MS;
  }

  private ensure(date: string): Promise<void> {
    if (this.fresh(date)) return Promise.resolve();
    const failed = this.failedAt.get(date);
    if (failed && Date.now() - failed < RETRY_AFTER_MS)
      return Promise.resolve();
    let p = this.inflight.get(date);
    if (!p) {
      p = this.fetchDay(date).finally(() => this.inflight.delete(date));
      this.inflight.set(date, p);
    }
    return p;
  }

  private async fetchDay(date: string): Promise<void> {
    await this.slot();
    try {
      const body = await safeFetch(chabadZmanimUrl(date), {
        allow: (h) => h === HOST,
        timeoutMs: 8_000,
        maxBytes: 256 * 1024,
        headers: { 'user-agent': UA, accept: 'application/rss+xml,*/*' },
        fetchImpl: this.fetchImpl,
      });
      const day = parseChabadZmanim(body.toString('utf8'), date);
      this.cache.set(date, { day, at: Date.now() });
      this.failedAt.delete(date);
      this.scheduleSave();
    } catch (e) {
      this.failedAt.set(date, Date.now());
      this.log.warn(`${date}: ${(e as Error).message}`);
    } finally {
      this.release();
    }
  }

  private slot(): Promise<void> {
    if (this.active < CONCURRENCY) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((r) => this.waiting.push(r));
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
  }

  private async load(): Promise<void> {
    try {
      const raw = JSON.parse(await fs.readFile(this.file, 'utf8')) as Record<
        string,
        Cached
      >;
      for (const [date, v] of Object.entries(raw))
        if (v?.day?.date === date) this.cache.set(date, v);
    } catch {
      // нет файла — начнём с пустого кэша
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer || process.env.NODE_ENV === 'test') return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      void this.save();
    }, 2_000);
    this.saveTimer.unref();
  }

  private async save(): Promise<void> {
    const oldest = addDays(kaliningradDate(), -7);
    const data: Record<string, Cached> = {};
    for (const [d, v] of this.cache) if (d >= oldest) data[d] = v;
    try {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file, JSON.stringify(data));
    } catch (e) {
      this.log.warn(`кэш не сохранён: ${(e as Error).message}`);
    }
  }
}
