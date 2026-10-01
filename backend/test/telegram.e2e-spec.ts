import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { importTelegram } from '../src/modules/content/telegram/telegram-import';
import { NewsEntity } from '../src/modules/content/entities';
import { sharp } from '../src/modules/content/uploads/sharp';
import { createTestApp, resetDb } from './helpers';

const page = (name: string) =>
  readFileSync(join(__dirname, 'fixtures/telegram', name), 'utf8');

// Три реальные страницы канала; пагинация склеена так: свежая → before=2244 →
// страница «до 2203» → её before=2173 → страница «до 2055» → дальше пусто.
const PAGES: Record<string, string> = {
  'https://t.me/s/B_C_Kaliningrad': page('page-2026-10-01.html'),
  'https://t.me/s/B_C_Kaliningrad?before=2244': page('page-before-2203.html'),
  'https://t.me/s/B_C_Kaliningrad?before=2173': page('page-before-2055.html'),
};

describe('Импорт новостей из Telegram (npm run import:telegram)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ds: DataSource;
  const uploadDir = mkdtempSync(join(tmpdir(), 'tg-uploads-'));
  const fetched: string[] = [];
  let png: Buffer;

  const opts = () => ({
    channel: 'B_C_Kaliningrad',
    since: '2026-09-10',
    uploadDir,
    fetchText: async (url: string) => {
      fetched.push(url);
      return PAGES[url] ?? '<html><body></body></html>';
    },
    fetchBytes: async () => png,
  });

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
    ds = app.get(DataSource);
    await resetDb(app);
    png = await sharp({
      create: { width: 8, height: 6, channels: 3, background: '#c8a24a' },
    })
      .png()
      .toBuffer();
  });

  afterAll(async () => {
    await app.close();
    rmSync(uploadDir, { recursive: true, force: true });
  });

  it('создаёт новости за период, повторный запуск дублей не даёт', async () => {
    const first = await importTelegram(ds, opts());
    // на страницах 2 + 12 + 9 постов; с 10 сентября — 2 + 12 + 2 (2048, 2052)
    expect(first.created).toBe(16);
    // страница «до 2055» начинается раньше since — дальше не листаем
    expect(fetched).toHaveLength(3);

    const again = await importTelegram(ds, opts());
    expect(again.created).toBe(0);
    const [{ n }] = await ds.query('SELECT count(*)::int AS n FROM news');
    expect(n).toBe(16);
  });

  it('GET /news/:slug отдаёт галерею альбома, обложку-первую и ссылку на пост', async () => {
    const [{ slug }] = await ds.query(
      `SELECT slug FROM news WHERE source_url = 'https://t.me/B_C_Kaliningrad/2264'`
    );
    const res = await http.get(`/api/v1/news/${slug}?lang=he`).expect(200);
    const item = res.body.data;
    expect(item.sourceUrl).toBe('https://t.me/B_C_Kaliningrad/2264');
    expect(item.images).toHaveLength(10);
    expect(item.images[0]).toEqual({
      url: expect.stringMatching(/^\/media\/[0-9a-f-]+\.webp$/),
      width: 8,
      height: 6,
      postUrl: 'https://t.me/B_C_Kaliningrad/2264',
    });
    expect(item.cover).toBe(item.images[0].url);
    expect(item.title).toBe('Женский вечер в сукке');
    expect(item.fallback).toBe(true);
    expect(item.publishedAt).toBe('2026-10-01T11:42:23.000Z');
    expect(
      item.body.startsWith('👩‍🍳 Женский вечер в сукке\n\nВчера у нас')
    ).toBe(true);
  });

  describe('надёжность: чужие адреса картинок и посты только с фото', () => {
    const msg = (id: number, date: string, text: string, imgs: string[]) =>
      `<div class="tgme_widget_message_wrap js-widget_message_wrap">` +
      `<div class="tgme_widget_message" data-post="TestChan/${id}">` +
      imgs
        .map(
          (u) =>
            `<a class="tgme_widget_message_photo_wrap" style="width:10px;background-image:url('${u}')"></a>`
        )
        .join('') +
      (text
        ? `<div class="tgme_widget_message_text js-message_text" dir="auto">${text}</div>`
        : '') +
      `<a class="tgme_widget_message_date" href="#"><time datetime="${date}" class="time">x</time></a>` +
      `</div></div>`;
    const run = (html: string) => {
      const logs: string[] = [];
      const bytes: string[] = [];
      return importTelegram(ds, {
        channel: 'TestChan',
        since: '2026-11-30',
        uploadDir,
        fetchText: async () => `<html><body>${html}</body></html>`,
        fetchBytes: async (url: string) => {
          bytes.push(url);
          return png;
        },
        log: (m) => logs.push(m),
      }).then((result) => ({ result, logs, bytes }));
    };
    const imagesOf = async (id: number) =>
      (
        await ds.query(`SELECT images FROM news WHERE source_url = $1`, [
          `https://t.me/TestChan/${id}`,
        ])
      )[0].images as { url: string }[];

    it('скачиваются только https-адреса CDN Telegram, остальные — в лог', async () => {
      const { result, logs, bytes } = await run(
        msg(1, '2026-12-01T09:00:00+00:00', 'Пост дня<br/>Текст', [
          'https://cdn4.telesco.pe/file/a.jpg',
          'http://cdn4.telesco.pe/file/plain.jpg',
          'https://evil.example/b.jpg',
        ])
      );
      expect(result.created).toBe(1);
      expect(bytes).toEqual(['https://cdn4.telesco.pe/file/a.jpg']);
      expect(await imagesOf(1)).toHaveLength(1);
      expect(logs.filter((l) => /не CDN Telegram/.test(l))).toHaveLength(2);
      expect(logs.join('\n')).toContain('https://evil.example/b.jpg');
    });

    it('пост только с фото без соседа в выборке дописывается к новости того же дня, повтор — без дублей', async () => {
      const page = msg(2, '2026-12-01T15:00:00+00:00', '', [
        'https://cdn4.telesco.pe/file/c.jpg',
        'https://cdn5.telesco.pe/file/d.jpg',
      ]);
      const first = await run(page);
      expect(first.result.photoPostsAppended).toBe(1);
      expect(await imagesOf(1)).toHaveLength(3);
      const [{ slug }] = await ds.query(
        `SELECT slug FROM news WHERE source_url = 'https://t.me/TestChan/1'`
      );
      const api = await http.get(`/api/v1/news/${slug}`).expect(200);
      expect(api.body.data.images.map((i: any) => i.postUrl)).toEqual([
        'https://t.me/TestChan/1',
        'https://t.me/TestChan/2',
        'https://t.me/TestChan/2',
      ]);
      const again = await run(page);
      expect(again.result.photoPostsAppended).toBe(0);
      expect(again.bytes).toEqual([]);
      expect(await imagesOf(1)).toHaveLength(3);
    });

    it('пост только с фото, когда новости того дня нет, — пропуск явно в логе', async () => {
      const { result, logs } = await run(
        msg(3, '2026-12-05T10:00:00+00:00', '', [
          'https://cdn4.telesco.pe/file/e.jpg',
        ])
      );
      expect(result.photoPostsSkipped).toBe(1);
      expect(logs.join('\n')).toMatch(/пропущен.*https:\/\/t\.me\/TestChan\/3/);
    });

    it('сосед фото-поста ищется только среди новостей канала: новость из админки того же дня не перехватывает', async () => {
      await run(
        msg(4, '2026-12-07T08:00:00+00:00', 'Утро в общине<br/>Текст', [
          'https://cdn4.telesco.pe/file/f.jpg',
        ])
      );
      const repo = ds.getRepository(NewsEntity);
      const admin = await repo.save(
        repo.create({
          slug: 'admin-news-same-day',
          title: { ru: 'Новость из админки' },
          body: { ru: 'Текст' },
          kind: 'news',
          status: 'published',
          publishedAt: new Date('2026-12-07T09:00:00+00:00'),
        })
      );
      const { result } = await run(
        msg(5, '2026-12-07T10:00:00+00:00', '', [
          'https://cdn4.telesco.pe/file/g.jpg',
        ])
      );
      expect(result.photoPostsAppended).toBe(1);
      expect(await imagesOf(4)).toHaveLength(2);
      expect((await repo.findOneByOrFail({ id: admin.id })).images).toEqual([]);
    });
  });

  it('пометки: видео и репост — в тексте новости', async () => {
    const [video] = await ds.query(
      `SELECT body->>'ru' AS body FROM news WHERE source_url = 'https://t.me/B_C_Kaliningrad/2244'`
    );
    expect(video.body).toContain('Видео — в источнике');
    const [fwd] = await ds.query(
      `SELECT body->>'ru' AS body FROM news WHERE source_url = 'https://t.me/B_C_Kaliningrad/2189'`
    );
    expect(fwd.body).toContain(
      'Репост из «Раввин Авраам Борух Дайч» (https://t.me/rabbikaliningrad/43)'
    );
  });
});
