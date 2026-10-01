import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { rmSync } from 'fs';
import { basename, join } from 'path';
import { sharp } from '../src/modules/content/uploads/sharp';
import { adminToken, createTestApp, resetDb } from './helpers';

describe('Контент: новости, события, сборы, загрузки, поиск, настройки (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let auth: { Authorization: string };

  const future = (days: number) =>
    new Date(Date.now() + days * 86_400_000).toISOString();
  const dateOnly = (days: number) => future(days).slice(0, 10);

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
    await resetDb(app);
    auth = { Authorization: `Bearer ${await adminToken(app)}` };
  });

  afterAll(async () => {
    await app.close();
  });

  describe('новости', () => {
    let id: string;
    let slug: string;

    it('без токена админ-эндпоинт закрыт', async () => {
      await http.post('/api/v1/admin/news').send({}).expect(401);
    });

    it('создание: ru-заголовок обязателен', async () => {
      const res = await http
        .post('/api/v1/admin/news')
        .set(auth)
        .send({ title: { en: 'No ru' }, body: { ru: 'Текст' } })
        .expect(400);
      expect(res.body.fields).toMatchObject({ 'title.ru': 'required' });
    });

    it('создание черновика → слаг транслитом из ru-заголовка', async () => {
      const res = await http
        .post('/api/v1/admin/news')
        .set(auth)
        .send({
          title: { ru: 'Ханука в общине', en: 'Hanukkah in the community' },
          lead: { ru: 'Зажигаем свечи' },
          body: { ru: 'Подробности', en: 'Details' },
        })
        .expect(201);
      id = res.body.data.id;
      slug = res.body.data.slug;
      expect(slug).toBe('khanuka-v-obshchine');
      expect(res.body.data.status).toBe('draft');
    });

    it('тот же заголовок → другой уникальный слаг', async () => {
      const res = await http
        .post('/api/v1/admin/news')
        .set(auth)
        .send({ title: { ru: 'Ханука в общине' }, body: { ru: 'x' } })
        .expect(201);
      expect(res.body.data.slug).toBe('khanuka-v-obshchine-2');
      await http
        .delete(`/api/v1/admin/news/${res.body.data.id}`)
        .set(auth)
        .expect(200);
    });

    it('черновик не виден публично', async () => {
      const list = await http.get('/api/v1/news').expect(200);
      expect(list.body.data.items).toEqual([]);
      await http.get(`/api/v1/news/${slug}`).expect(404);
      const admin = await http.get('/api/v1/admin/news').set(auth).expect(200);
      expect(admin.body.data.items).toHaveLength(1);
    });

    it('публикация → видна; he без перевода → ru + fallback:true', async () => {
      await http
        .patch(`/api/v1/admin/news/${id}`)
        .set(auth)
        .send({ status: 'published' })
        .expect(200);
      const he = await http.get(`/api/v1/news/${slug}?lang=he`).expect(200);
      expect(he.body.data).toMatchObject({
        title: 'Ханука в общине',
        body: 'Подробности',
        fallback: true,
      });
      expect(he.body.data.publishedAt).toBeTruthy();
      const en = await http.get('/api/v1/news?lang=en').expect(200);
      expect(en.body.data.items[0]).toMatchObject({
        slug,
        title: 'Hanukkah in the community',
        lead: 'Зажигаем свечи',
        fallback: true,
      });
      expect(en.body.data).toMatchObject({ total: 1, hasMore: false });
    });

    it('пагинация «Загрузить ещё»: по 9, hasMore', async () => {
      for (let i = 0; i < 10; i++) {
        await http
          .post('/api/v1/admin/news')
          .set(auth)
          .send({
            title: { ru: `Анонс ${i}` },
            body: { ru: 'x' },
            kind: 'announcement',
            status: 'published',
          })
          .expect(201);
      }
      const p1 = await http.get('/api/v1/news').expect(200);
      expect(p1.body.data.items).toHaveLength(9);
      expect(p1.body.data.hasMore).toBe(true);
      const p2 = await http.get('/api/v1/news?page=2').expect(200);
      expect(p2.body.data.items).toHaveLength(2);
      expect(p2.body.data.hasMore).toBe(false);
    });

    it('удаление', async () => {
      await http.delete(`/api/v1/admin/news/${id}`).set(auth).expect(200);
      await http.get(`/api/v1/news/${slug}`).expect(404);
    });
  });

  describe('события', () => {
    let id: string;

    it('CRUD: платное событие с лестницей цен, priceNow на сегодня', async () => {
      const created = await http
        .post('/api/v1/admin/events')
        .set(auth)
        .send({
          title: { ru: 'Седер Песах' },
          description: { ru: 'Пасхальная трапеза' },
          startsAt: future(30),
          place: { ru: 'Большой зал' },
          isPaid: true,
          priceTiers: [
            { until: dateOnly(-1), priceRub: 300 },
            { until: dateOnly(5), priceRub: 500 },
            { until: null, priceRub: 800 },
          ],
          capacity: 50,
          status: 'published',
        })
        .expect(201);
      id = created.body.data.id;
      const res = await http
        .get(`/api/v1/events/${created.body.data.slug}`)
        .expect(200);
      expect(res.body.data).toMatchObject({
        title: 'Седер Песах',
        place: 'Большой зал',
        isPaid: true,
        priceNow: 500,
        priceTierIndex: 1,
        capacity: 50,
      });
      expect(res.body.data.priceTiers).toHaveLength(3);
    });

    it('бесплатное — priceNow null; черновик и прошедшие не в афише', async () => {
      await http
        .post('/api/v1/admin/events')
        .set(auth)
        .send({
          title: { ru: 'Лекция' },
          description: { ru: 'x' },
          startsAt: future(3),
          status: 'published',
        })
        .expect(201);
      await http
        .post('/api/v1/admin/events')
        .set(auth)
        .send({
          title: { ru: 'Черновик' },
          description: { ru: 'x' },
          startsAt: future(1),
        })
        .expect(201);
      await http
        .post('/api/v1/admin/events')
        .set(auth)
        .send({
          title: { ru: 'Прошло' },
          description: { ru: 'x' },
          startsAt: future(-3),
          status: 'published',
        })
        .expect(201);
      const list = await http.get('/api/v1/events').expect(200);
      expect(list.body.data.items.map((e: any) => e.title)).toEqual([
        'Лекция',
        'Седер Песах',
      ]);
      expect(list.body.data.items[0].priceNow).toBeNull();
      const past = await http.get('/api/v1/events?past=1').expect(200);
      expect(past.body.data.items.map((e: any) => e.title)).toEqual(['Прошло']);
    });

    it('правка и удаление', async () => {
      await http
        .patch(`/api/v1/admin/events/${id}`)
        .set(auth)
        .send({ title: { ru: 'Седер Песах 5787', he: 'סדר פסח' } })
        .expect(200);
      const he = await http.get('/api/v1/events?lang=he').expect(200);
      expect(he.body.data.items[1]).toMatchObject({
        title: 'סדר פסח',
        fallback: true,
      });
      await http.delete(`/api/v1/admin/events/${id}`).set(auth).expect(200);
      await http
        .patch(`/api/v1/admin/events/${id}`)
        .set(auth)
        .send({ capacity: 10 })
        .expect(404);
    });
  });

  describe('сборы', () => {
    it('CRUD: активные публично, закрытый — только по слагу', async () => {
      const res = await http
        .post('/api/v1/admin/fundraisers')
        .set(auth)
        .send({
          title: { ru: 'Сбор на микву' },
          body: { ru: 'Описание' },
          goalRub: 100000,
        })
        .expect(201);
      const { id, slug } = res.body.data;
      let list = await http.get('/api/v1/fundraisers').expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0]).toMatchObject({
        title: 'Сбор на микву',
        goalRub: 100000,
        raisedRub: 0,
        supporters: 0,
      });
      await http
        .patch(`/api/v1/admin/fundraisers/${id}`)
        .set(auth)
        .send({ status: 'closed' })
        .expect(200);
      list = await http.get('/api/v1/fundraisers').expect(200);
      expect(list.body.data).toEqual([]);
      await http.get(`/api/v1/fundraisers/${slug}`).expect(200);
      await http
        .delete(`/api/v1/admin/fundraisers/${id}`)
        .set(auth)
        .expect(200);
      await http.get(`/api/v1/fundraisers/${slug}`).expect(404);
    });
  });

  describe('загрузка фото', () => {
    it('не картинка → 400', async () => {
      await http
        .post('/api/v1/admin/uploads')
        .set(auth)
        .attach('file', Buffer.from('hello'), {
          filename: 'a.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('подделка под jpg (не декодируется) → 400', async () => {
      await http
        .post('/api/v1/admin/uploads')
        .set(auth)
        .attach('file', Buffer.from('not really a jpeg'), {
          filename: 'a.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    });

    it('больше 10 МБ → 400', async () => {
      await http
        .post('/api/v1/admin/uploads')
        .set(auth)
        .attach('file', Buffer.alloc(10 * 1024 * 1024 + 1), {
          filename: 'big.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    });

    it('картинка → webp ≤ 2000px, URL раздаётся', async () => {
      const png = await sharp({
        create: { width: 3000, height: 1500, channels: 3, background: '#cfa' },
      })
        .png()
        .toBuffer();
      const res = await http
        .post('/api/v1/admin/uploads')
        .set(auth)
        .attach('file', png, { filename: 'p.png', contentType: 'image/png' })
        .expect(201);
      const url: string = res.body.data.url;
      expect(url).toMatch(/^\/media\/.+\.webp$/);
      const file = await http.get(url).expect(200);
      const meta = await sharp(file.body as Buffer).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.width).toBe(2000);
      expect(meta.height).toBe(1000);
      // Не копим файлы в test/fixtures/uploads: удаляем созданное.
      rmSync(join(process.env.UPLOAD_DIR ?? './uploads', basename(url)), {
        force: true,
      });
    });
  });

  describe('поиск', () => {
    beforeAll(async () => {
      await http
        .post('/api/v1/admin/programs')
        .set(auth)
        .send({
          title: { ru: 'Колель Тора', en: 'Kollel Torah' },
          published: true,
        })
        .expect(201);
      await http
        .post('/api/v1/admin/departments')
        .set(auth)
        .send({ title: { ru: 'Кошерная столовая' }, published: false })
        .expect(201);
    });

    it('короткий запрос → 400', async () => {
      const res = await http.get('/api/v1/search?q=а').expect(400);
      expect(res.body.fields).toEqual({ q: 'too_short' });
    });

    it('находит опубликованное на нужном языке, не находит неопубликованное', async () => {
      const en = await http.get('/api/v1/search?q=kollel&lang=en').expect(200);
      expect(en.body.data.items).toEqual([
        expect.objectContaining({
          type: 'program',
          title: 'Kollel Torah',
          url: '/programs',
        }),
      ]);
      const ru = await http
        .get(`/api/v1/search?q=${encodeURIComponent('седер')}`)
        .expect(200);
      expect(ru.body.data.items).toEqual([]); // опубликованный седер удалён, черновик скрыт
      const lecture = await http
        .get(`/api/v1/search?q=${encodeURIComponent('лекц')}`)
        .expect(200);
      expect(lecture.body.data.items[0]).toMatchObject({
        type: 'event',
        url: expect.stringMatching(/^\/events\//),
      });
      const hidden = await http
        .get(`/api/v1/search?q=${encodeURIComponent('кошерная')}`)
        .expect(200);
      expect(hidden.body.data.items).toEqual([]);
    });
  });

  describe('настройки', () => {
    it('supportersCount = оплаченные пожертвования + смещение', async () => {
      const db = app.get(DataSource);
      const pay = (purpose: string, status: string) =>
        db.query(
          `INSERT INTO payments (purpose, amount_rub, status, access_token)
           VALUES ($1, 100, $2, 'tok')`,
          [purpose, status]
        );
      await pay('donation', 'paid');
      await pay('donation', 'paid');
      await pay('donation', 'pending');
      await pay('prayer', 'paid');
      let res = await http.get('/api/v1/settings/public').expect(200);
      expect(res.body.data.supportersCount).toBe(2);

      await http
        .put('/api/v1/admin/settings')
        .set(auth)
        .send({ supporters_offset: 40, header_phones: ['+7 000'] })
        .expect(200);
      res = await http.get('/api/v1/settings/public').expect(200);
      expect(res.body.data).toMatchObject({
        supportersCount: 42,
        headerPhones: ['+7 000'],
      });
      const admin = await http
        .get('/api/v1/admin/settings')
        .set(auth)
        .expect(200);
      expect(admin.body.data.supporters_offset).toBe(40);
    });

    it('неизвестный ключ настроек → 400', async () => {
      await http
        .put('/api/v1/admin/settings')
        .set(auth)
        .send({ hacker: 1 })
        .expect(400);
    });

    it('null в значении очищает ключ (не 500)', async () => {
      await http
        .put('/api/v1/admin/settings')
        .set(auth)
        .send({ kaddish_month_rub: 1800, requisites: { ru: 'Счёт' } })
        .expect(200);
      const res = await http
        .put('/api/v1/admin/settings')
        .set(auth)
        .send({ kaddish_month_rub: null, requisites: null })
        .expect(200);
      expect(res.body.data).toMatchObject({
        kaddish_month_rub: null,
        requisites: null,
      });
      const pub = await http.get('/api/v1/settings/public').expect(200);
      expect(pub.body.data).toMatchObject({
        kaddishMonthRub: null,
        requisites: null,
      });
    });
  });

  describe('админ-эндпоинты', () => {
    it('?albumId= не uuid → 400 fields.albumId', async () => {
      const res = await http
        .get('/api/v1/admin/photos?albumId=not-a-uuid')
        .set(auth)
        .expect(400);
      expect(res.body.fields).toEqual({ albumId: 'invalid_format' });
    });
  });

  it('гонка слага: одновременные создания с одним заголовком — не 500, слаги разные', async () => {
    const res = await Promise.all(
      Array.from({ length: 6 }, () =>
        http
          .post('/api/v1/admin/news')
          .set(auth)
          .send({ title: { ru: 'Гонка слагов' }, body: { ru: 'x' } })
      )
    );
    expect(res.map((r) => r.status)).toEqual(Array(6).fill(201));
    const slugs = res.map((r) => r.body.data.slug as string);
    expect(new Set(slugs).size).toBe(6);
  });
});
