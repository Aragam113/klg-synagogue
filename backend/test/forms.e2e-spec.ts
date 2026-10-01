import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './helpers';
import { ProbeModule } from './probe.module';

const valid = { name: 'Анна', consent: true, title: { ru: 'Заголовок' } };

describe('Общая инфраструктура форм (e2e)', () => {
  describe('валидация и honeypot', () => {
    let app: INestApplication;
    let http: ReturnType<typeof request>;

    beforeAll(async () => {
      app = await createTestApp({ imports: [ProbeModule] });
      http = request(app.getHttpServer());
    });
    afterAll(async () => {
      await app.close();
    });

    it('валидное тело проходит', async () => {
      const res = await http.post('/api/v1/probe/form').send(valid).expect(201);
      expect(res.body).toMatchObject({ success: true, data: { name: 'Анна' } });
    });

    it('400: fields с машинными ключами, включая вложенный ru', async () => {
      const res = await http
        .post('/api/v1/probe/form')
        .send({ name: '', email: 'не-почта', title: { en: 'Only English' } })
        .expect(400);
      expect(res.body).toMatchObject({
        success: false,
        statusCode: 400,
        message: 'Проверьте заполнение полей',
      });
      expect(res.body.fields).toEqual({
        name: 'required',
        email: 'email',
        consent: 'required',
        'title.ru': 'required',
      });
    });

    it('400: слишком длинное значение и нет локализуемого поля целиком', async () => {
      const res = await http
        .post('/api/v1/probe/form')
        .send({ name: 'x'.repeat(21), consent: true })
        .expect(400);
      expect(res.body.fields).toEqual({ name: 'too_long', title: 'required' });
    });

    it('лишнее поле → 400 unknown_field (и во вложенном объекте)', async () => {
      const res = await http
        .post('/api/v1/probe/form')
        .send({ ...valid, isAdmin: true, title: { ru: 'Т', fr: 'T' } })
        .expect(400);
      expect(res.body.fields).toEqual({
        isAdmin: 'unknown_field',
        'title.fr': 'unknown_field',
      });
    });

    it('пустой honeypot `website` не мешает', async () => {
      await http
        .post('/api/v1/probe/form')
        .send({ ...valid, website: '' })
        .expect(201);
    });

    it('заполненный honeypot → 400 без подробностей', async () => {
      const res = await http
        .post('/api/v1/probe/form')
        .send({ ...valid, website: 'http://spam.example' })
        .expect(400);
      expect(res.body.fields).toBeUndefined();
      expect(res.body.message).toBe('Некорректный запрос');
    });
  });

  describe('лимит 10 отправок в минуту с IP на все формы', () => {
    let app: INestApplication;
    let http: ReturnType<typeof request>;
    const saved = process.env.FORMS_RATE_LIMIT;

    beforeAll(async () => {
      process.env.FORMS_RATE_LIMIT = '10';
      app = await createTestApp({ imports: [ProbeModule] });
      http = request(app.getHttpServer());
    });
    afterAll(async () => {
      process.env.FORMS_RATE_LIMIT = saved;
      await app.close();
    });

    it('10 отправок в разные формы проходят, 11-я → 429; не-формы не лимитируются', async () => {
      for (let i = 0; i < 6; i++) {
        await http.post('/api/v1/probe/form').send(valid).expect(201);
      }
      for (let i = 0; i < 4; i++) {
        await http.post('/api/v1/probe/other-form').send({}).expect(201);
      }
      const res = await http.post('/api/v1/probe/form').send(valid).expect(429);
      expect(res.body).toMatchObject({ success: false, statusCode: 429 });
      expect(res.body.message).toMatch(/Слишком много/);
      await http.post('/api/v1/probe/not-a-form').send({}).expect(201);
    });
  });

  describe('раздача /media', () => {
    let app: INestApplication;
    beforeAll(async () => {
      app = await createTestApp();
    });
    afterAll(async () => {
      await app.close();
    });

    it('файл из UPLOAD_DIR доступен по /media/<имя>', async () => {
      const res = await request(app.getHttpServer())
        .get('/media/probe.txt')
        .expect(200);
      expect(res.text.trim()).toBe('media ok');
    });
  });
});
