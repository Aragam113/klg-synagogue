import { INestApplication, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { adminToken, createTestApp, resetDb } from './helpers';

const API = '/api/v1';

const donor = {
  purpose: 'donation',
  anonymous: false,
  donorName: 'Анна',
  email: 'anna@example.com',
  consent: true,
};

/** Дата YYYY-MM-DD через n дней от сегодня (по Калининграду). */
function inDays(n: number): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kaliningrad',
  }).format(new Date());
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('payments (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let db: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
    db = app.get(DataSource);
  });
  beforeEach(() => resetDb(app));
  afterAll(() => app.close());

  const create = (body: Record<string, unknown>) =>
    http.post(`${API}/payments`).send(body);
  const fake = (
    p: { paymentId: string; accessToken: string },
    action: string
  ) =>
    http
      .post(`${API}/payments/fake/${p.paymentId}/${action}`)
      .query({ token: p.accessToken });
  const status = (p: { paymentId: string; accessToken: string }) =>
    http
      .get(`${API}/payments/${p.paymentId}`)
      .query({ token: p.accessToken })
      .expect(200)
      .then((r) => r.body.data);
  const supporters = () =>
    http
      .get(`${API}/settings/public`)
      .expect(200)
      .then((r) => r.body.data.supportersCount as number);

  it('пожертвование → fake pay → paid, счётчик вырос', async () => {
    const res = await create({ ...donor, amountRub: 360 }).expect(201);
    const p = res.body.data;
    expect(p.paymentId).toEqual(expect.any(String));
    expect(p.accessToken).toEqual(expect.any(String));
    expect(p.confirmUrl).toContain(`/dev-pay/${p.paymentId}`);
    expect(await status(p)).toMatchObject({
      status: 'pending',
      amountRub: 360,
    });
    expect(await supporters()).toBe(0);

    await fake(p, 'pay').expect(200);
    expect(await status(p)).toMatchObject({ status: 'paid', amountRub: 360 });
    expect(await supporters()).toBe(1);
  });

  it('cancel → canceled, ничего не выросло; отменённый не оплатить ни своим токеном, ни чужим', async () => {
    const p = (await create({ ...donor, amountRub: 180 }).expect(201)).body
      .data;
    await fake(p, 'cancel').expect(200);
    expect((await status(p)).status).toBe('canceled');
    expect(await supporters()).toBe(0);
    await fake({ ...p, accessToken: 'чужой' }, 'pay').expect(404);
    const again = await fake(p, 'pay').expect(200);
    expect(again.body.data.status).toBe('canceled');
    expect((await status(p)).status).toBe('canceled');
    expect(await supporters()).toBe(0);
  });

  it('сумма вне 100–1 000 000 и без согласия → 400 с полями', async () => {
    const r1 = await create({ ...donor, amountRub: 99 }).expect(400);
    expect(r1.body.fields.amountRub).toBe('out_of_range');
    const r2 = await create({ ...donor, amountRub: 1_000_001 }).expect(400);
    expect(r2.body.fields.amountRub).toBe('out_of_range');
    const r3 = await create({ ...donor, amountRub: 500, consent: false });
    expect(r3.status).toBe(400);
    const r4 = await create({ ...donor }).expect(400);
    expect(r4.body.fields.amountRub).toBe('required');
  });

  describe('сбор', () => {
    const fundraiser = () =>
      db
        .query(
          `INSERT INTO fundraisers (slug, title, body, goal_rub, raised_rub, supporters, status)
           VALUES ('roof', '{"ru":"Крыша"}', '{"ru":"Текст"}', 100000, 1000, 3, 'active')`
        )
        .then(() =>
          http
            .get(`${API}/fundraisers/roof`)
            .expect(200)
            .then((r) => r.body.data)
        );

    it('raised/supporters меняются только после paid; повтор уведомления не удваивает', async () => {
      await fundraiser();
      const p = (
        await create({
          ...donor,
          amountRub: 540,
          fundraiserSlug: 'roof',
        }).expect(201)
      ).body.data;
      let f = await http
        .get(`${API}/fundraisers/roof`)
        .then((r) => r.body.data);
      expect(f).toMatchObject({ raisedRub: 1000, supporters: 3 });

      await fake(p, 'pay').expect(200);
      f = await http.get(`${API}/fundraisers/roof`).then((r) => r.body.data);
      expect(f).toMatchObject({ raisedRub: 1540, supporters: 4 });

      // повторное уведомление кассы
      await fake(p, 'pay').expect(200);
      const { PaymentsService } =
        await import('../src/modules/payments/payments.service');
      const changed = await app
        .get(PaymentsService)
        .applyNotification(`fake-${p.paymentId}`, 'paid');
      expect(changed).toBe(false);
      f = await http.get(`${API}/fundraisers/roof`).then((r) => r.body.data);
      expect(f).toMatchObject({ raisedRub: 1540, supporters: 4 });
      expect((await status(p)).fundraiser).toMatchObject({ slug: 'roof' });
    });

    it('отменённое пожертвование в сбор ничего не меняет', async () => {
      await fundraiser();
      const p = (
        await create({
          ...donor,
          amountRub: 540,
          fundraiserSlug: 'roof',
        }).expect(201)
      ).body.data;
      await fake(p, 'cancel').expect(200);
      const f = await http
        .get(`${API}/fundraisers/roof`)
        .then((r) => r.body.data);
      expect(f).toMatchObject({ raisedRub: 1000, supporters: 3 });
    });
  });

  /** Платное событие (лестница 500 → 700 → 900 ₽, сегодня 700) и регистрация на 2 места. */
  const paidRegistration = async (): Promise<string> => {
    const starts = new Date(Date.now() + 20 * 86400_000).toISOString();
    await db.query(
      `INSERT INTO events (slug, title, description, starts_at, is_paid, price_tiers, status)
       VALUES ('concert', '{"ru":"Концерт"}', '{"ru":"Описание"}', $1, true, $2, 'published')`,
      [
        starts,
        JSON.stringify([
          { until: inDays(-1), priceRub: 500 },
          { until: inDays(10), priceRub: 700 },
          { until: null, priceRub: 900 },
        ]),
      ]
    );
    const reg = (
      await http
        .post(`${API}/events/concert/register`)
        .send({
          name: 'Анна',
          phone: '+7 900 000-00-00',
          seats: 2,
          consent: true,
        })
        .expect(201)
    ).body.data;
    return reg.id as string;
  };

  it('платный билет: сумма по лестнице цен на сегодня × места, клиентская игнорируется; оплата подтверждает регистрацию', async () => {
    const reg = { id: await paidRegistration() };
    const p = (
      await create({
        ...donor,
        purpose: 'event',
        registrationId: reg.id,
        amountRub: 100,
      }).expect(201)
    ).body.data;
    expect(await status(p)).toMatchObject({
      amountRub: 1400,
      event: { slug: 'concert' },
    });
    await fake(p, 'pay').expect(200);
    const [row] = await db.query(
      `SELECT status, payment_id FROM event_registrations WHERE id = $1`,
      [reg.id]
    );
    expect(row).toEqual({ status: 'confirmed', payment_id: p.paymentId });
    // билет — не пожертвование
    expect(await supporters()).toBe(0);
    // уже оплаченную регистрацию повторно не оплатить
    await create({ ...donor, purpose: 'event', registrationId: reg.id }).expect(
      409
    );
  });

  it('на одну регистрацию — один оплачиваемый платёж; повторная оплата не перепривязывает регистрацию', async () => {
    const regId = await paidRegistration();
    const ticket = { ...donor, purpose: 'event', registrationId: regId };
    const a = (
      await http
        .post(`${API}/payments`)
        .set('Idempotency-Key', 'ticket-a')
        .send(ticket)
        .expect(201)
    ).body.data;
    const b = (
      await http
        .post(`${API}/payments`)
        .set('Idempotency-Key', 'ticket-b')
        .send(ticket)
        .expect(201)
    ).body.data;
    expect(b.paymentId).toBe(a.paymentId);
    const c = (await create(ticket).expect(201)).body.data;
    expect(c.paymentId).toBe(a.paymentId);
    const [{ n }] = await db.query(
      `SELECT count(*)::int AS n FROM payments WHERE registration_id = $1`,
      [regId]
    );
    expect(n).toBe(1);

    // отменённый платёж не мешает создать новый
    await fake(a, 'cancel').expect(200);
    const d = (await create(ticket).expect(201)).body.data;
    expect(d.paymentId).not.toBe(a.paymentId);
    await fake(d, 'pay').expect(200);

    // посторонний платёж на ту же регистрацию (касса прислала «оплачено»)
    // не перепривязывает уже подтверждённую регистрацию
    const [{ id: strayId }] = await db.query(
      `INSERT INTO payments (purpose, amount_rub, registration_id, email, status, provider_payment_id, access_token)
       VALUES ('event', 1400, $1, 'x@example.com', 'pending', 'fake-stray', 'stray-token') RETURNING id`,
      [regId]
    );
    expect(strayId).toEqual(expect.any(String));
    const { PaymentsService } =
      await import('../src/modules/payments/payments.service');
    await app.get(PaymentsService).applyNotification('fake-stray', 'paid');
    const [row] = await db.query(
      `SELECT status, payment_id FROM event_registrations WHERE id = $1`,
      [regId]
    );
    expect(row).toEqual({ status: 'confirmed', payment_id: d.paymentId });
  });

  describe('Кадиш', () => {
    const kaddish = () =>
      http
        .post(`${API}/requests/prayer`)
        .send({
          prayerType: 'kaddish',
          lastName: 'Иванова',
          firstName: 'Анна',
          email: 'anna@example.com',
          deceasedName: 'Давид',
          fatherName: 'Авраам',
          deathDate: '2026-05-01',
          months: 3,
          consent: true,
        })
        .expect(201)
        .then((r) => r.body.data.id as string);

    it('с тарифом: сумма = месяцы × тариф', async () => {
      const auth = { Authorization: `Bearer ${await adminToken(app)}` };
      await http
        .put(`${API}/admin/settings`)
        .set(auth)
        .send({ kaddish_month_rub: 1800 })
        .expect(200);
      const requestId = await kaddish();
      const p = (
        await create({
          ...donor,
          purpose: 'prayer',
          requestId,
          amountRub: 100,
        }).expect(201)
      ).body.data;
      expect((await status(p)).amountRub).toBe(5400);
    });

    it('без тарифа: свободная сумма (и она обязательна)', async () => {
      const requestId = await kaddish();
      await create({ ...donor, purpose: 'prayer', requestId }).expect(400);
      const p = (
        await create({
          ...donor,
          purpose: 'prayer',
          requestId,
          amountRub: 777,
        }).expect(201)
      ).body.data;
      expect((await status(p)).amountRub).toBe(777);
    });
  });

  it('ежемесячное: подписка после оплаты, отмена по токену; чужой токен → 404', async () => {
    const p = (
      await create({ ...donor, amountRub: 360, recurring: true }).expect(201)
    ).body.data;
    expect((await status(p)).subscription).toBeNull();
    await fake(p, 'pay').expect(200);
    const sub = (await status(p)).subscription;
    expect(sub).toMatchObject({
      status: 'active',
      cancelToken: expect.any(String),
    });

    await http
      .post(`${API}/recurring/${sub.id}/cancel`)
      .query({ token: 'не-тот' })
      .expect(404);
    await http
      .post(`${API}/recurring/${sub.id}/cancel`)
      .query({ token: sub.cancelToken })
      .expect(200);
    expect((await status(p)).subscription.status).toBe('canceled');

    const auth = { Authorization: `Bearer ${await adminToken(app)}` };
    const list = await http.get(`${API}/admin/recurring`).set(auth).expect(200);
    expect(list.body.data).toEqual([
      expect.objectContaining({
        id: sub.id,
        amountRub: 360,
        status: 'canceled',
      }),
    ]);
    expect(list.body.data[0].cancelToken).toBeUndefined();
  });

  it('посвящение не видно до одобрения редактором; после — в ленте', async () => {
    const p = (
      await create({
        ...donor,
        anonymous: true,
        amountRub: 1800,
        dedication: 'В память о бабушке',
      }).expect(201)
    ).body.data;
    await fake(p, 'pay').expect(200);
    const feed = () =>
      http
        .get(`${API}/dedications`)
        .expect(200)
        .then((r) => r.body.data);
    expect(await feed()).toEqual([]);

    const auth = { Authorization: `Bearer ${await adminToken(app)}` };
    await http.get(`${API}/admin/payments`).expect(401);
    const list = await http
      .get(`${API}/admin/payments?purpose=donation&status=paid`)
      .set(auth)
      .expect(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].accessToken).toBeUndefined();
    await http
      .patch(`${API}/admin/payments/${p.paymentId}/dedication`)
      .set(auth)
      .send({ visible: true })
      .expect(200);
    expect(await feed()).toEqual([
      expect.objectContaining({
        name: null,
        anonymous: true,
        text: 'В память о бабушке',
      }),
    ]);
  });

  it('токены доступа и отмены подписки не попадают в лог запросов', async () => {
    const log = jest.spyOn(Logger.prototype, 'log');
    const err = jest.spyOn(Logger.prototype, 'error');
    const warn = jest.spyOn(Logger.prototype, 'warn');
    try {
      const p = (
        await create({ ...donor, amountRub: 360, recurring: true }).expect(201)
      ).body.data;
      await status(p);
      await fake(p, 'pay').expect(200);
      const sub = (await status(p)).subscription;
      await http
        .post(`${API}/recurring/${sub.id}/cancel`)
        .query({ token: sub.cancelToken })
        .expect(200);
      await fake({ ...p, accessToken: 'secret-wrong-token' }, 'pay').expect(
        404
      );
      const lines = [...log.mock.calls, ...err.mock.calls, ...warn.mock.calls]
        .map((c) => String(c[0]))
        .join('\n');
      expect(lines).toContain(`/payments/${p.paymentId}`);
      expect(lines).not.toContain(p.accessToken);
      expect(lines).not.toContain(sub.cancelToken);
      expect(lines).not.toContain('secret-wrong-token');
      expect(lines).not.toContain('token=');
    } finally {
      log.mockRestore();
      err.mockRestore();
      warn.mockRestore();
    }
  });

  it('невалидный id → 400 (ParseUUIDPipe), а не 404', async () => {
    await http
      .get(`${API}/payments/not-a-uuid`)
      .query({ token: 'x' })
      .expect(400);
    await http
      .post(`${API}/payments/fake/not-a-uuid/pay`)
      .query({ token: 'x' })
      .expect(400);
    await http
      .post(`${API}/recurring/not-a-uuid/cancel`)
      .query({ token: 'x' })
      .expect(400);
    const auth = { Authorization: `Bearer ${await adminToken(app)}` };
    await http
      .patch(`${API}/admin/payments/not-a-uuid/dedication`)
      .set(auth)
      .send({ visible: true })
      .expect(400);
  });

  it('Idempotency-Key: повтор отдаёт тот же платёж', async () => {
    const send = () =>
      http
        .post(`${API}/payments`)
        .set('Idempotency-Key', 'pay-key-1')
        .send({ ...donor, amountRub: 360 })
        .expect(201)
        .then((r) => r.body.data);
    const a = await send();
    const b = await send();
    expect(b).toEqual(a);
  });
});

describe('PAYMENT_MODE', () => {
  // Касса создаётся фабрикой провайдера PAYMENT_PROVIDER в PaymentsModule при старте;
  // проверяем фабрику напрямую, чтобы не поднимать приложение с открытым подключением к БД.
  it('real и неизвестный режим — понятная ошибка старта; по умолчанию fake', async () => {
    const { createPaymentProvider } =
      await import('../src/modules/payments/payment-provider');
    expect(() => createPaymentProvider('real')).toThrow(
      /Реальная касса не подключена/
    );
    expect(() => createPaymentProvider('yookassa')).toThrow(
      /Реальная касса не подключена/
    );
    expect(createPaymentProvider(undefined).mode).toBe('fake');
    expect(createPaymentProvider('fake').mode).toBe('fake');
  });
});

describe('касса в режиме real (провайдер подменён)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const { PAYMENT_PROVIDER } =
      await import('../src/modules/payments/payment-provider');
    app = await createTestApp({
      override: (b) =>
        b.overrideProvider(PAYMENT_PROVIDER).useValue({
          mode: 'real',
          create: async ({ paymentId }: { paymentId: string }) => ({
            providerPaymentId: `real-${paymentId}`,
            confirmUrl: `https://pay.example/${paymentId}`,
          }),
          getStatus: async () => 'pending',
        }),
    });
    http = request(app.getHttpServer());
  });
  beforeEach(() => resetDb(app));
  afterAll(() => app.close());

  it('тестовая касса /payments/fake/* отвечает 404, платёж остаётся pending', async () => {
    expect(
      (await http.get(`${API}/payments/mode`).expect(200)).body.data
    ).toEqual({ mode: 'real' });
    const p = (
      await http
        .post(`${API}/payments`)
        .send({ ...donor, amountRub: 360 })
        .expect(201)
    ).body.data;
    expect(p.confirmUrl).toBe(`https://pay.example/${p.paymentId}`);
    for (const action of ['pay', 'cancel'])
      await http
        .post(`${API}/payments/fake/${p.paymentId}/${action}`)
        .query({ token: p.accessToken })
        .expect(404);
    const s = await http
      .get(`${API}/payments/${p.paymentId}`)
      .query({ token: p.accessToken })
      .expect(200);
    expect(s.body.data.status).toBe('pending');
  });
});
