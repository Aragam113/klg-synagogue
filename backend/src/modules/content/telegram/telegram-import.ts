import { Between, DataSource, IsNull, Not } from 'typeorm';
import {
  kaliningradDate,
  kaliningradDayStart,
} from '../../calendar/kaliningrad-time';
import { NewsEntity, NewsImage } from '../entities';
import { MAX_UPLOAD_BYTES, saveImageAsWebp } from '../uploads/image';
import { slugify, uniqueSlug } from '../slug';
import { parseChannelPage, TgPost } from './telegram-parser';
import { PhotoPart, postsToNews } from './telegram-news';
import {
  FetchFailed,
  FetchRejected,
  TELEGRAM_CDN,
  TELEGRAM_PAGES,
  allowedUrl,
  safeFetch,
} from './safe-fetch';

export interface ImportTelegramOptions {
  /** Имя канала без @, например `B_C_Kaliningrad`. */
  channel: string;
  /** 'YYYY-MM-DD' — брать посты с этой даты (по Калининграду, UTC+2). */
  since: string;
  uploadDir: string;
  fetchText?: (url: string) => Promise<string>;
  fetchBytes?: (url: string) => Promise<Buffer>;
  log?: (msg: string) => void;
}

export interface ImportTelegramResult {
  pages: number;
  posts: number;
  created: number;
  existing: number;
  /** Сколько созданных новостей с альбомом (> 1 картинки). */
  withAlbums: number;
  images: number;
  /** Картинки, которые не скачались или отвергнуты (не CDN, больше лимита); каждая — в логе. */
  imagesFailed: number;
  /** Посты только с фото, дописанные к уже сохранённой новости того же дня. */
  photoPostsAppended: number;
  /** Посты только с фото без новости того же дня — пропущены, каждый — в логе. */
  photoPostsSkipped: number;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const MAX_PAGES = 200;
const PAGE_TIMEOUT_MS = 30_000;
const PAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 60_000;

/** t.me напрямую; если недоступен — то же через r.jina.ai в виде HTML. */
async function defaultFetchText(url: string): Promise<string> {
  const get = (u: string, headers: Record<string, string>) =>
    safeFetch(u, {
      allow: TELEGRAM_PAGES,
      timeoutMs: PAGE_TIMEOUT_MS,
      maxBytes: PAGE_MAX_BYTES,
      headers,
    }).then((b) => b.toString('utf8'));
  try {
    return await get(url, { 'user-agent': UA });
  } catch (e) {
    if (e instanceof FetchRejected) throw e;
  }
  return get(`https://r.jina.ai/${url}`, { 'x-return-format': 'html' });
}

/** CDN Telegram изредка отвечает 5xx — до трёх попыток с паузой; отказы allowlist/лимита не повторяем. */
async function defaultFetchBytes(url: string): Promise<Buffer> {
  let last: Error = new FetchFailed(-1);
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1000 * attempt));
    try {
      return await safeFetch(url, {
        allow: TELEGRAM_CDN,
        timeoutMs: IMAGE_TIMEOUT_MS,
        maxBytes: MAX_UPLOAD_BYTES,
        headers: { 'user-agent': UA },
      });
    } catch (e) {
      last = e as Error;
      if (!(e instanceof FetchFailed) || (e.status >= 0 && e.status < 500))
        break;
    }
  }
  throw last;
}

export async function importTelegram(
  ds: DataSource,
  opts: ImportTelegramOptions
): Promise<ImportTelegramResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.since))
    throw new Error('since: ожидается YYYY-MM-DD');
  const fetchText = opts.fetchText ?? defaultFetchText;
  const fetchBytes = opts.fetchBytes ?? defaultFetchBytes;
  const log = opts.log ?? (() => undefined);
  const since = kaliningradDayStart(opts.since).getTime();
  const base = `https://t.me/s/${opts.channel}`;

  const posts = new Map<number, TgPost>();
  let before: number | null = null;
  let pages = 0;
  while (pages < MAX_PAGES) {
    const page = parseChannelPage(
      await fetchText(before ? `${base}?before=${before}` : base)
    );
    pages++;
    for (const p of page.posts) posts.set(p.id, p);
    const oldest = Math.min(...page.posts.map((p) => Date.parse(p.date)));
    if (!page.posts.length || oldest < since || !page.before) break;
    before = page.before;
  }

  const fresh = [...posts.values()].filter((p) => Date.parse(p.date) >= since);
  const { drafts, orphans } = postsToNews(fresh, opts.channel);
  const repo = ds.getRepository(NewsEntity);
  const result: ImportTelegramResult = {
    pages,
    posts: drafts.length,
    created: 0,
    existing: 0,
    withAlbums: 0,
    images: 0,
    imagesFailed: 0,
    photoPostsAppended: 0,
    photoPostsSkipped: 0,
  };

  /** Картинки одного поста → сохранённые webp с пометкой поста-источника. */
  const download = async (part: PhotoPart): Promise<NewsImage[]> => {
    const out: NewsImage[] = [];
    for (const src of part.imageUrls) {
      if (!allowedUrl(src, TELEGRAM_CDN)) {
        result.imagesFailed++;
        log(
          `  картинка пропущена (${part.sourceUrl}): не CDN Telegram — ${src}`
        );
        continue;
      }
      try {
        const saved = await saveImageAsWebp(
          await fetchBytes(src),
          opts.uploadDir
        );
        out.push({ ...saved, source: part.sourceUrl });
      } catch (e) {
        result.imagesFailed++;
        log(
          `  картинка пропущена (${part.sourceUrl}): ${(e as Error).message}`
        );
      }
    }
    return out;
  };

  /** Дописывает посты только с фото к сохранённой новости; уже дописанные (по source) — пропускает. */
  const append = async (news: NewsEntity, parts: PhotoPart[]) => {
    const images = [...(news.images ?? [])];
    let added = 0;
    for (const part of parts) {
      if (part.sourceUrl === news.sourceUrl) continue;
      if (images.some((im) => im.source === part.sourceUrl)) continue;
      const got = await download(part);
      images.push(...got);
      added += got.length;
      result.photoPostsAppended++;
      log(`  + ${got.length} фото из ${part.sourceUrl} → ${news.slug}`);
    }
    if (!added) return;
    news.images = images;
    news.cover ??= images[0]?.url ?? null;
    await repo.save(news);
  };

  for (const d of drafts) {
    const saved = await repo.findOneBy({ sourceUrl: d.sourceUrl });
    if (saved) {
      result.existing++;
      await append(saved, d.parts);
      continue;
    }
    const images: NewsImage[] = [];
    for (const part of d.parts) images.push(...(await download(part)));
    const slug = await uniqueSlug(slugify(d.title), (s) =>
      repo.existsBy({ slug: s })
    );
    await repo.save(
      repo.create({
        slug,
        title: { ru: d.title },
        lead: d.lead ? { ru: d.lead } : null,
        body: { ru: d.body },
        cover: images[0]?.url ?? null,
        images,
        sourceUrl: d.sourceUrl,
        kind: 'news',
        status: 'published',
        publishedAt: d.publishedAt,
      })
    );
    result.created++;
    result.images += images.length;
    if (images.length > 1) result.withAlbums++;
    log(
      `+ ${d.publishedAt.toISOString().slice(0, 10)} ${d.title} (${images.length} фото)`
    );
  }

  // Посты только с фото без соседа в выборке → к последней новости канала того же дня.
  for (const o of orphans) {
    const day = kaliningradDate(o.publishedAt);
    const [target] = await repo.find({
      where: {
        publishedAt: Between(kaliningradDayStart(day), o.publishedAt),
        // только новости канала: новость из админки (без sourceUrl) не перехватывает фото
        sourceUrl: Not(IsNull()),
      },
      order: { publishedAt: 'DESC' },
      take: 1,
    });
    if (!target?.sourceUrl) {
      result.photoPostsSkipped++;
      log(
        `! пост только с фото пропущен: ${o.sourceUrl} — за ${day} нет новости канала`
      );
      continue;
    }
    await append(target, [o]);
  }
  return result;
}
