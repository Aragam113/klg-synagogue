import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { adminToken, createTestApp, resetDb } from './helpers';

const EMPTY = { shacharit: null, mincha: null, maariv: null };

describe('Календарь и расписание (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
    token = await adminToken(app);
  });

  beforeEach(() => resetDb(app));

  afterAll(async () => {
    await app.close();
  });

  it('GET /calendar/days: Шаббат 14.11.2026 — свечи, исход, глава; пустой шаблон → services null', async () => {
    const res = await http
      .get('/api/v1/calendar/days?from=2026-11-13&to=2026-11-14&lang=ru')
      .expect(200);
    const [fri, sat] = res.body.data;
    expect(fri).toMatchObject({
      date: '2026-11-13',
      candleLighting: '16:21',
      services: null,
    });
    expect(sat).toMatchObject({
      havdalah: '17:37',
      parasha: 'Толдот',
      closed: true,
    });
    expect(Object.keys(sat.zmanim)).toEqual([
      'alot',
      'talit',
      'sunrise',
      'shma',
      'tfila',
      'chatzot',
      'shkia',
      'tzet',
    ]);
  });

  it('GET /calendar/days: по умолчанию 14 дней; диапазон > 62 дней → 400', async () => {
    const res = await http.get('/api/v1/calendar/days').expect(200);
    expect(res.body.data).toHaveLength(14);
    const long = await http
      .get('/api/v1/calendar/days?from=2026-01-01&to=2026-03-15')
      .expect(400);
    expect(long.body.fields).toEqual({ to: 'range_too_long' });
    expect(long.body.message).toMatch(/[а-я]/);
    const bad = await http
      .get('/api/v1/calendar/days?from=2026-13-01')
      .expect(400);
    expect(bad.body.fields).toEqual({ from: 'invalid_date' });
    const back = await http
      .get('/api/v1/calendar/days?from=2026-03-02&to=2026-03-01')
      .expect(400);
    expect(back.body.fields).toEqual({ to: 'invalid_range' });
    const adm = await http
      .get('/api/v1/admin/schedule/overrides/2026-02-30')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(adm.body.fields).toEqual({ date: 'invalid_date' });
  });

  it('GET /calendar/today: два ближайших зажигания и Шаббат', async () => {
    const res = await http.get('/api/v1/calendar/today?lang=en').expect(200);
    const { today, nextCandles, nextShabbat } = res.body.data;
    expect(today.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(nextCandles).toHaveLength(2);
    expect(Date.parse(nextCandles[0].at)).toBeGreaterThan(Date.now());
    expect(Date.parse(nextCandles[1].at)).toBeGreaterThan(
      Date.parse(nextCandles[0].at)
    );
    // в праздничный Шаббат (напр. Шмини Ацерет) недельной главы нет — parasha null
    expect(nextShabbat.candles.at).toEqual(expect.any(String));
    expect(
      nextShabbat.parasha === null || typeof nextShabbat.parasha === 'string'
    ).toBe(true);
  });

  it('GET /calendar/holidays/:key: описание и даты в году; неизвестный ключ → 404', async () => {
    const res = await http
      .get('/api/v1/calendar/holidays/yom-kippur?year=2026&lang=ru')
      .expect(200);
    expect(res.body.data.title).toBe('Йом Кипур');
    expect(res.body.data.dates.map((d: { date: string }) => d.date)).toEqual([
      '2026-09-20', // канун (Кол Нидрей)
      '2026-09-21',
    ]);
    await http.get('/api/v1/calendar/holidays/nope').expect(404);
  });

  it('admin: без токена 401; PUT шаблона и исключения меняет выдачу days', async () => {
    const tpl = {
      weekday: { ...EMPTY, shacharit: '08:30' },
      friday: EMPTY,
      shabbat: EMPTY,
    };
    await http.put('/api/v1/admin/schedule/template').send(tpl).expect(401);
    await http
      .put('/api/v1/admin/schedule/overrides/2026-11-12')
      .send(EMPTY)
      .expect(401);

    const auth = { Authorization: `Bearer ${token}` };
    await http
      .put('/api/v1/admin/schedule/template')
      .set(auth)
      .send(tpl)
      .expect(200);
    await http
      .put('/api/v1/admin/schedule/template')
      .set(auth)
      .send({ ...tpl, weekday: { ...EMPTY, shacharit: '25:00' } })
      .expect(400);
    await http
      .put('/api/v1/admin/schedule/overrides/2026-11-12')
      .set(auth)
      .send({ ...EMPTY, mincha: '15:00', note: { ru: 'Особая молитва' } })
      .expect(200);

    const res = await http
      .get('/api/v1/calendar/days?from=2026-11-11&to=2026-11-12')
      .expect(200);
    const [wed, thu] = res.body.data;
    expect(wed.services).toEqual({
      shacharit: '08:30',
      mincha: null,
      maariv: null,
    });
    expect(thu.services).toEqual({
      shacharit: null,
      mincha: '15:00',
      maariv: null,
    });
    expect(thu.note).toBe('Особая молитва');

    await http
      .delete('/api/v1/admin/schedule/overrides/2026-11-12')
      .set(auth)
      .expect(200);
    const after = await http.get(
      '/api/v1/calendar/days?from=2026-11-12&to=2026-11-12'
    );
    expect(after.body.data[0].services.shacharit).toBe('08:30');
  });

  // Белые ночи: с середины мая до конца июля алот а-шахар (16.1°) не наступает —
  // раньше hhmm(Invalid Date) ронял весь диапазон в 500.
  it('GET /calendar/days: 01.05–31.08.2027 окнами по 62 дня — 200, ненаступивший зман = null', async () => {
    const windows: [string, string][] = [
      ['2027-05-01', '2027-07-01'],
      ['2027-07-02', '2027-08-31'],
    ];
    const days: { date: string; zmanim: Record<string, string | null> }[] = [];
    for (const [from, to] of windows) {
      const res = await http
        .get(`/api/v1/calendar/days?from=${from}&to=${to}&lang=ru`)
        .expect(200);
      days.push(...res.body.data);
    }
    expect(days).toHaveLength(123);
    expect(days[0].date).toBe('2027-05-01');
    expect(days[122].date).toBe('2027-08-31');
    const solstice = days.find((d) => d.date === '2027-06-21')!;
    expect(solstice.zmanim.alot).toBeNull();
    expect(solstice.zmanim.tzet).toMatch(/^\d{2}:\d{2}$/);
  });
});
