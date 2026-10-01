import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { seedContent } from '../src/shared/database/seeds/content.seed';
import { createTestApp, resetDb } from './helpers';

describe('Сиды контента (npm run seed)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ds: DataSource;
  const uploadDir = mkdtempSync(join(tmpdir(), 'seed-uploads-'));

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
    ds = app.get(DataSource);
    await resetDb(app);
  });

  afterAll(async () => {
    await app.close();
    rmSync(uploadDir, { recursive: true, force: true });
  });

  const counts = async () => {
    const out: Record<string, number> = {};
    for (const t of [
      'news',
      'events',
      'programs',
      'departments',
      'albums',
      'photos',
      'site_settings',
    ]) {
      const [{ n }] = await ds.query(`SELECT count(*)::int AS n FROM ${t}`);
      out[t] = n;
    }
    return out;
  };

  it('засевает реальные факты: приёмная, столовая, музей, программы, настройки', async () => {
    await seedContent(ds, { uploadDir });

    const deps = (await http.get('/api/v1/departments').expect(200)).body.data;
    const museum = deps.find((d: { title: string }) =>
      d.title.includes('Музей')
    );
    // источник — JM-info
    expect(museum.phones).toContain('+7 921 008-25-00');
    expect(museum.email).toBe('visitor@jmkaliningrad.org');

    const programs = (await http.get('/api/v1/programs').expect(200)).body.data;
    expect(programs.map((p: { title: string }) => p.title)).toEqual(
      expect.arrayContaining(['Колель Тора', 'STARS', 'Воскресная школа'])
    );

    const settings = (await http.get('/api/v1/settings/public').expect(200))
      .body.data;
    expect(settings.headerPhones).toEqual(['+7 (4012) 46-43-45']);
    expect(settings.requisites).toMatch(/^\[ВПИШИ:/);

    // событий в источниках нет — афиша пуста, никаких выдуманных событий
    expect(
      (await http.get('/api/v1/events').expect(200)).body.data.items
    ).toEqual([]);
  });

  it('альбом «Здание синагоги»: только Commons-фото, webp раздаётся, у каждого атрибуция', async () => {
    const albums = (await http.get('/api/v1/albums').expect(200)).body.data;
    const building = albums.find(
      (a: { title: string }) => a.title === 'Здание синагоги'
    );
    expect(building).toBeDefined();
    const album = (
      await http.get(`/api/v1/albums/${building.slug}`).expect(200)
    ).body.data;
    expect(album.photos.length).toBeGreaterThanOrEqual(6);
    for (const p of album.photos) {
      expect(p.file).toMatch(/^\/media\/.+\.webp$/);
      expect(p.credit).toMatch(
        /(CC BY|CC0|Public domain).*commons\.wikimedia\.org/
      );
    }
    expect(readdirSync(uploadDir).length).toBeGreaterThanOrEqual(
      album.photos.length
    );
  });

  it('у засеянных новостей есть обложка — Commons-фото из альбомов, с атрибуцией в тексте', async () => {
    const list = (await http.get('/api/v1/news').expect(200)).body.data.items;
    expect(list.length).toBeGreaterThanOrEqual(1);
    const [{ files }] = await ds.query(
      `SELECT array_agg(file) AS files FROM photos`
    );
    for (const n of list) {
      expect(files).toContain(n.cover);
      const item = (await http.get(`/api/v1/news/${n.slug}`).expect(200)).body
        .data;
      expect(item.body).toMatch(/Фото:.*commons\.wikimedia\.org/);
    }
  });

  it('повторный запуск ничего не дублирует', async () => {
    const before = await counts();
    const files = readdirSync(uploadDir).length;
    await seedContent(ds, { uploadDir });
    expect(await counts()).toEqual(before);
    expect(readdirSync(uploadDir).length).toBe(files);
  });

  it('повторный запуск не затирает правки редактора', async () => {
    await ds.query(
      `UPDATE site_settings SET value = '["+7 000"]' WHERE key = 'header_phones'`
    );
    await seedContent(ds, { uploadDir });
    const settings = (await http.get('/api/v1/settings/public').expect(200))
      .body.data;
    expect(settings.headerPhones).toEqual(['+7 000']);
  });

  it('в данных сидов у каждой строки с телефоном/ценой/e-mail/ссылкой есть источник', () => {
    const src = readFileSync(
      join(__dirname, '../src/shared/database/seeds/content.data.ts'),
      'utf8'
    ).split('\n');
    const factLike =
      /(\+7[\d ()-]{7,}|\d+\s?(₽|руб)|[\w.-]+@[\w.-]+\.\w+|https?:\/\/)/;
    const unsourced = src.filter(
      (line) => factLike.test(line) && !/\/\/ src: \S+/.test(line)
    );
    expect(unsourced).toEqual([]);
  });
});
