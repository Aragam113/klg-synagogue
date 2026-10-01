import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { RequestsService } from '../src/modules/requests/requests.service';
import { adminToken, createTestApp, resetDb } from './helpers';

const API = '/api/v1';

/** Дата YYYY-MM-DD через n дней от сегодня (по Калининграду). */
function inDays(n: number, weekdayWanted?: number): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kaliningrad',
  });
  const today = fmt.format(new Date());
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  if (weekdayWanted !== undefined) {
    while (d.getUTCDay() !== weekdayWanted) d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

const customer = {
  lastName: 'Иванова',
  firstName: 'Анна',
  email: 'anna@example.com',
  consent: true,
};

/** Валидное тело каждой формы и одно обязательное поле, которое проверяем на пустоту. */
const FORMS: Record<
  string,
  { body: Record<string, unknown>; required: string }
> = {
  prayer: {
    body: {
      ...customer,
      prayerType: 'misheberah',
      forName: 'Давид',
      motherName: 'Сара',
      times: 3,
    },
    required: 'motherName',
  },
  excursion: {
    // Вторник не раньше чем через 4 дня — не Шаббат и не слишком скоро.
    body: {
      name: 'Tourist',
      phone: '+7 900 000-00-00',
      date: inDays(4, 2),
      time: '12:00',
      people: 4,
      language: 'de',
      kind: 'scheduled',
      consent: true,
    },
    required: 'phone',
  },
  appointment: {
    body: {
      to: 'rabbi',
      name: 'Пётр',
      phone: '+7 900 111-11-11',
      topic: 'Свадьба',
      text: 'Хотим поставить хупу',
      consent: true,
    },
    required: 'topic',
  },
  'rabbi-question': {
    body: {
      name: 'Пётр',
      phone: '+7 900 111-11-11',
      topic: 'Кашрут',
      text: 'Можно ли…',
      consent: true,
    },
    required: 'text',
  },
  help: {
    body: {
      kind: 'material',
      fullName: 'Иванов Иван Иванович',
      phone: '+7 900 222-22-22',
      email: 'ivan@example.com',
      birthDate: '1950-03-01',
      address: 'Калининград',
      roots: 'mother',
      situation: 'Нужна помощь с продуктами',
      otherHelp: 'Нет',
      question: 'Как получить продуктовый набор?',
      consent: true,
    },
    required: 'situation',
  },
  volunteer: {
    body: {
      name: 'Мария',
      phone: '+7 900 333-33-33',
      areas: ['meals', 'it'],
      availability: 'по воскресеньям',
      consent: true,
    },
    required: 'name',
  },
};

describe('Заявки форм (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });
  beforeEach(async () => {
    await resetDb(app);
  });
  afterAll(async () => {
    await app.close();
  });

  describe.each(Object.entries(FORMS))(
    'форма %s',
    (form, { body, required }) => {
      const url = `${API}/requests/${form}`;

      it('успех → {id}', async () => {
        const res = await http.post(url).send(body).expect(201);
        expect(res.body.data.id).toMatch(/^[0-9a-f-]{36}$/);
      });

      it('пустое обязательное поле → ключ required', async () => {
        const res = await http
          .post(url)
          .send({ ...body, [required]: '' })
          .expect(400);
        expect(res.body.fields).toEqual({ [required]: 'required' });
      });

      it('без согласия → отказ', async () => {
        const res = await http
          .post(url)
          .send({ ...body, consent: false })
          .expect(400);
        expect(res.body.fields).toEqual({ consent: 'required' });
      });

      it('заполненный honeypot → 400 и заявка не создана', async () => {
        await http
          .post(url)
          .send({ ...body, website: 'http://spam' })
          .expect(400);
        const [{ n }] = await app
          .get(DataSource)
          .query('SELECT count(*)::int AS n FROM requests');
        expect(n).toBe(0);
      });

      it('повтор с тем же Idempotency-Key → тот же id, одна запись', async () => {
        const key = `k-${form}`;
        const a = await http
          .post(url)
          .set('Idempotency-Key', key)
          .send(body)
          .expect(201);
        const b = await http
          .post(url)
          .set('Idempotency-Key', key)
          .send(body)
          .expect(201);
        expect(b.body.data.id).toBe(a.body.data.id);
        const [{ n }] = await app
          .get(DataSource)
          .query('SELECT count(*)::int AS n FROM requests');
        expect(n).toBe(1);
      });
    }
  );

  describe('экскурсия: правила даты', () => {
    const base = FORMS.excursion.body;
    it('через 2 дня → date_too_soon', async () => {
      const res = await http
        .post(`${API}/requests/excursion`)
        .send({ ...base, date: inDays(2) })
        .expect(400);
      expect(res.body.fields).toEqual({ date: 'date_too_soon' });
    });
    it('суббота → date_closed', async () => {
      const res = await http
        .post(`${API}/requests/excursion`)
        .send({ ...base, date: inDays(4, 6) })
        .expect(400);
      expect(res.body.fields).toEqual({ date: 'date_closed' });
    });
    it('несуществующая дата 2026-02-31 → date', async () => {
      const res = await http
        .post(`${API}/requests/excursion`)
        .send({ ...base, date: '2026-02-31' })
        .expect(400);
      expect(res.body.fields).toEqual({ date: 'date' });
    });
    it('язык экскурсии — только ru/de/en (как в источниках): he → invalid_choice', async () => {
      const res = await http
        .post(`${API}/requests/excursion`)
        .send({ ...base, language: 'he' })
        .expect(400);
      expect(res.body.fields).toEqual({ language: 'invalid_choice' });
    });
  });

  describe('молитва: напоминание о годовщине', () => {
    const yahrzeit = {
      ...customer,
      prayerType: 'yahrzeit',
      deceasedName: 'Моше',
      fatherName: 'Авраам',
      deathDate: '2020-03-15',
      remindByEmail: true,
    };
    it('Йорцайт с «напоминать по email» → строка напоминания', async () => {
      const res = await http
        .post(`${API}/requests/prayer`)
        .send(yahrzeit)
        .expect(201);
      const rows = await app
        .get(DataSource)
        .query('SELECT * FROM yahrzeit_reminders WHERE request_id = $1', [
          res.body.data.id,
        ]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        by_email: true,
        by_phone: false,
        deceased_name: 'Моше',
      });
    });
    it('Кадиш: месяцев 12 → out_of_range', async () => {
      const res = await http
        .post(`${API}/requests/prayer`)
        .send({
          ...customer,
          prayerType: 'kaddish',
          deceasedName: 'Моше',
          fatherName: 'Авраам',
          deathDate: '2026-08-01',
          months: 12,
        })
        .expect(400);
      expect(res.body.fields).toEqual({ months: 'out_of_range' });
    });
    it('годовщина считается от переданного «сейчас», а не от даты прогона', async () => {
      await http.post(`${API}/requests/prayer`).send(yahrzeit).expect(201);
      const service = app.get(RequestsService);
      // 15.03.2020 = 19 Адара 5780 (простой год). 5787 — високосный; по Рама (ОХ 568:7)
      // йорцайт за Адар простого года — в Адар I: 19 Адара I 5787 = 26.02.2027.
      const list = await service.upcomingYahrzeits(
        30,
        new Date('2027-02-10T12:00:00Z')
      );
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        anniversary: '2027-02-26',
        daysLeft: 16,
      });
      // после годовщины — следующая: 19 Адара 5788 (простой год) = 17.03.2028
      const next = await service.upcomingYahrzeits(
        30,
        new Date('2028-03-01T12:00:00Z')
      );
      expect(next[0]).toMatchObject({ anniversary: '2028-03-17' });
    });
    it('админ видит годовщину (еврейская дата) в списке', async () => {
      const token = await adminToken(app);
      await http.post(`${API}/requests/prayer`).send(yahrzeit).expect(201);
      const res = await http
        .get(`${API}/admin/yahrzeits?days=366`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        deceasedName: 'Моше',
        byEmail: true,
      });
      // точная дата годовщины проверяется выше с фиксированным «сейчас»
      expect(res.body.data[0].anniversary).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('регистрация на событие', () => {
    async function event(over: Record<string, unknown> = {}) {
      const [row] = await app.get(DataSource).query(
        `INSERT INTO events (slug, title, description, starts_at, status, capacity, is_paid)
         VALUES ($1, '{"ru":"Седер"}', '{"ru":"Описание"}', $2, $3, $4, $5) RETURNING id`,
        [
          over.slug ?? 'seder',
          over.startsAt ?? new Date(Date.now() + 7 * 86400000),
          over.status ?? 'published',
          'capacity' in over ? over.capacity : 5,
          over.isPaid ?? false,
        ]
      );
      return row.id as string;
    }
    const reg = {
      name: 'Анна',
      phone: '+7 900 000-00-00',
      seats: 2,
      consent: true,
    };
    const url = (slug: string) => `${API}/events/${slug}/register`;

    it('платное: {id, eventId, isPaid}; статус new без платежа', async () => {
      const id = await event({ isPaid: true });
      const res = await http.post(url('seder')).send(reg).expect(201);
      expect(res.body.data).toMatchObject({
        eventId: id,
        isPaid: true,
        seats: 2,
      });
      const [row] = await app
        .get(DataSource)
        .query(
          'SELECT status, payment_id FROM event_registrations WHERE id = $1',
          [res.body.data.id]
        );
      expect(row).toEqual({ status: 'new', payment_id: null });
    });
    it('превышение мест → 409 с остатком; всё занято → sold_out', async () => {
      await event({ capacity: 5 });
      await http
        .post(url('seder'))
        .send({ ...reg, seats: 3 })
        .expect(201);
      const res = await http
        .post(url('seder'))
        .send({ ...reg, seats: 3 })
        .expect(409);
      expect(res.body.fields).toEqual({ seats: 'seats_left:2' });
      await http
        .post(url('seder'))
        .send({ ...reg, seats: 2 })
        .expect(201);
      const full = await http
        .post(url('seder'))
        .send({ ...reg, seats: 1 })
        .expect(409);
      expect(full.body.message).toBe('sold_out');
    });
    it('прошедшее или черновик → 404', async () => {
      await event({ slug: 'past', startsAt: new Date(Date.now() - 86400000) });
      await event({ slug: 'draft', status: 'draft' });
      await http.post(url('past')).send(reg).expect(404);
      await http.post(url('draft')).send(reg).expect(404);
    });
  });

  describe('подписка', () => {
    it('повтор того же email → 200 и тот же id', async () => {
      const body = {
        name: 'Анна',
        email: 'Anna@Example.com',
        livesInCity: true,
        consent: true,
      };
      const a = await http.post(`${API}/subscribe`).send(body).expect(200);
      const b = await http
        .post(`${API}/subscribe`)
        .send({ ...body, email: 'anna@example.com' })
        .expect(200);
      expect(b.body.data.id).toBe(a.body.data.id);
    });
  });

  describe('админка', () => {
    let auth: Record<string, string>;
    beforeEach(async () => {
      auth = { Authorization: `Bearer ${await adminToken(app)}` };
    });

    it('без токена → 401', async () => {
      await http.get(`${API}/admin/requests`).expect(401);
      await http.get(`${API}/admin/subscribers.csv`).expect(401);
      await http.get(`${API}/admin/yahrzeits`).expect(401);
    });

    it('фильтр по типу и статусу, PATCH статуса и заметки', async () => {
      const prayer = await http
        .post(`${API}/requests/prayer`)
        .send(FORMS.prayer.body);
      await http.post(`${API}/requests/volunteer`).send(FORMS.volunteer.body);
      const id = prayer.body.data.id;

      const byType = await http
        .get(`${API}/admin/requests?type=prayer`)
        .set(auth)
        .expect(200);
      expect(byType.body.data.total).toBe(1);
      expect(byType.body.data.items[0]).toMatchObject({
        id,
        type: 'prayer',
        status: 'new',
      });

      await http
        .patch(`${API}/admin/requests/${id}`)
        .set(auth)
        .send({ status: 'in_progress', adminNote: 'Позвонить' })
        .expect(200);
      const inWork = await http
        .get(`${API}/admin/requests?status=in_progress`)
        .set(auth)
        .expect(200);
      expect(inWork.body.data.items.map((r: { id: string }) => r.id)).toEqual([
        id,
      ]);
      const one = await http
        .get(`${API}/admin/requests/${id}`)
        .set(auth)
        .expect(200);
      expect(one.body.data.adminNote).toBe('Позвонить');
    });

    it('CSV подписчиков и регистраций', async () => {
      await http
        .post(`${API}/subscribe`)
        .send({ name: 'Анна', email: 'anna@example.com', consent: true });
      const subs = await http
        .get(`${API}/admin/subscribers.csv`)
        .set(auth)
        .expect(200);
      expect(subs.headers['content-type']).toMatch(/text\/csv/);
      expect(subs.text).toContain('anna@example.com');

      const [ev] = await app.get(DataSource).query(
        `INSERT INTO events (slug, title, description, starts_at, status)
         VALUES ('e', '{"ru":"Т"}', '{"ru":"О"}', now() + interval '3 days', 'published') RETURNING id`
      );
      await http
        .post(`${API}/events/e/register`)
        .send({
          name: 'Борис',
          phone: '+7 900 000-00-01',
          seats: 1,
          consent: true,
        })
        .expect(201);
      const csv = await http
        .get(`${API}/admin/events/${ev.id}/registrations.csv`)
        .set(auth)
        .expect(200);
      expect(csv.text).toContain('Борис');
      expect(csv.text).toContain('+7 900 000-00-01');
    });
  });
});

describe('лимит форм (e2e)', () => {
  let app: INestApplication;
  const saved = process.env.FORMS_RATE_LIMIT;
  beforeAll(async () => {
    process.env.FORMS_RATE_LIMIT = '10';
    app = await createTestApp();
    await resetDb(app);
  });
  afterAll(async () => {
    process.env.FORMS_RATE_LIMIT = saved;
    await app.close();
  });

  it('10 отправок разных форм проходят, 11-я → 429', async () => {
    const http = request(app.getHttpServer());
    const forms = Object.entries(FORMS);
    for (let i = 0; i < 10; i++) {
      const [form, { body }] = forms[i % forms.length];
      await http.post(`${API}/requests/${form}`).send(body).expect(201);
    }
    await http
      .post(`${API}/subscribe`)
      .send({ name: 'Анна', email: 'a@example.com', consent: true })
      .expect(429);
  });
});
