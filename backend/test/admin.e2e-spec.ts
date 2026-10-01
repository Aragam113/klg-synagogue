import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { TEST_EDITOR_EMAIL, TEST_EDITOR_PASSWORD } from './setup-env';
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  adminToken,
  createTestApp,
} from './helpers';

describe('Вход в админку (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('верные email и пароль → 200 {token}', async () => {
    const res = await http
      .post('/api/v1/admin/login')
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it('второй редактор из ADMIN_USERS тоже входит; email без учёта регистра', async () => {
    await http
      .post('/api/v1/admin/login')
      .send({
        email: ` ${TEST_EDITOR_EMAIL.toUpperCase()} `,
        password: TEST_EDITOR_PASSWORD,
      })
      .expect(200);
  });

  it('неверный пароль и неизвестный email → одинаковый 401', async () => {
    const wrongPassword = await http
      .post('/api/v1/admin/login')
      .send({ email: TEST_ADMIN_EMAIL, password: 'wrong-password' })
      .expect(401);
    const unknownEmail = await http
      .post('/api/v1/admin/login')
      .send({ email: 'nobody@test.local', password: TEST_ADMIN_PASSWORD })
      .expect(401);
    expect(wrongPassword.body.message).toBe('Неверный email или пароль');
    expect(unknownEmail.body.message).toBe('Неверный email или пароль');
  });

  it('пароль одного редактора не подходит к email другого', async () => {
    await http
      .post('/api/v1/admin/login')
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_EDITOR_PASSWORD })
      .expect(401);
  });

  it('GET /admin/ping без токена → 401, с токеном → 200', async () => {
    const res = await http.get('/api/v1/admin/ping').expect(401);
    expect(res.body).toMatchObject({ success: false, statusCode: 401 });
    const token = await adminToken(app);
    const ok = await http
      .get('/api/v1/admin/ping')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(ok.body.data).toEqual({ email: TEST_ADMIN_EMAIL });
  });

  it('поддельный токен → 401', async () => {
    await http
      .get('/api/v1/admin/ping')
      .set(
        'Authorization',
        'Bearer eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.x'
      )
      .expect(401);
  });

  it('токен, подписанный нашим секретом, но без role:admin → 401', async () => {
    const jwt = app.get(JwtService);
    for (const payload of [
      { sub: TEST_ADMIN_EMAIL },
      { sub: TEST_ADMIN_EMAIL, role: 'editor' },
    ]) {
      const token = await jwt.signAsync(payload);
      await http
        .get('/api/v1/admin/ping')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    }
  });
  it('?lang= разрешён на всех админ-эндпоинтах, прочие лишние параметры — нет', async () => {
    const auth = { Authorization: `Bearer ${await adminToken(app)}` };
    for (const path of [
      '/admin/requests',
      '/admin/yahrzeits',
      '/admin/subscribers',
      '/admin/payments',
      '/admin/recurring',
      '/admin/news',
      '/admin/photos',
      '/admin/settings',
      '/admin/schedule/template',
    ]) {
      const res = await http.get(`/api/v1${path}?lang=he`).set(auth);
      expect(`${path} ${res.status}`).toBe(`${path} 200`);
    }
    const bad = await http
      .get('/api/v1/admin/requests?lang=ru&hacker=1')
      .set(auth)
      .expect(400);
    expect(bad.body.fields).toEqual({ hacker: 'unknown_field' });
  });
});
