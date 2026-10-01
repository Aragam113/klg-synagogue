import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Вся схема сайта (сущности — `src/modules/<модуль>/entities`).
 * Перечислимые поля — varchar + CHECK; локализуемые — jsonb {ru, en?, he?}.
 * Строка schedule_template id=1 создаётся пустой (время служб вписывает редактор).
 */
export class InitSchema1790000000000 implements MigrationInterface {
  name = 'InitSchema1790000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE news (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug varchar(200) NOT NULL CONSTRAINT "UQ_news_slug" UNIQUE,
        title jsonb NOT NULL,
        lead jsonb,
        body jsonb NOT NULL,
        cover varchar(500),
        kind varchar(20) NOT NULL DEFAULT 'news'
          CONSTRAINT "CHK_news_kind" CHECK (kind IN ('news', 'announcement')),
        status varchar(20) NOT NULL DEFAULT 'draft'
          CONSTRAINT "CHK_news_status" CHECK (status IN ('draft', 'published')),
        published_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug varchar(200) NOT NULL CONSTRAINT "UQ_events_slug" UNIQUE,
        title jsonb NOT NULL,
        description jsonb NOT NULL,
        cover varchar(500),
        starts_at timestamptz NOT NULL,
        ends_at timestamptz,
        place jsonb,
        is_paid boolean NOT NULL DEFAULT false,
        price_tiers jsonb NOT NULL DEFAULT '[]',
        capacity int CONSTRAINT "CHK_events_capacity" CHECK (capacity IS NULL OR capacity > 0),
        status varchar(20) NOT NULL DEFAULT 'draft'
          CONSTRAINT "CHK_events_status" CHECK (status IN ('draft', 'published')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE fundraisers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug varchar(200) NOT NULL CONSTRAINT "UQ_fundraisers_slug" UNIQUE,
        title jsonb NOT NULL,
        body jsonb NOT NULL,
        cover varchar(500),
        goal_rub int,
        raised_rub int NOT NULL DEFAULT 0,
        supporters int NOT NULL DEFAULT 0,
        status varchar(20) NOT NULL DEFAULT 'active'
          CONSTRAINT "CHK_fundraisers_status" CHECK (status IN ('active', 'closed')),
        ends_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE programs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title jsonb NOT NULL,
        audience jsonb,
        schedule jsonb,
        contact varchar(300),
        cover varchar(500),
        sort int NOT NULL DEFAULT 0,
        published boolean NOT NULL DEFAULT false
      )`);

    await q.query(`
      CREATE TABLE departments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title jsonb NOT NULL,
        description jsonb,
        address jsonb,
        phones text[] NOT NULL DEFAULT '{}',
        email varchar(254),
        hours jsonb,
        cover varchar(500),
        sort int NOT NULL DEFAULT 0,
        published boolean NOT NULL DEFAULT false
      )`);

    await q.query(`
      CREATE TABLE albums (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug varchar(200) NOT NULL CONSTRAINT "UQ_albums_slug" UNIQUE,
        title jsonb NOT NULL,
        cover varchar(500),
        sort int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE photos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        album_id uuid NOT NULL CONSTRAINT "FK_photos_album" REFERENCES albums(id) ON DELETE CASCADE,
        file varchar(500) NOT NULL,
        caption jsonb,
        credit varchar(300),
        sort int NOT NULL DEFAULT 0
      )`);
    await q.query(`CREATE INDEX "IDX_photos_album_id" ON photos (album_id)`);

    await q.query(`
      CREATE TABLE site_settings (
        key varchar(100) PRIMARY KEY,
        value jsonb NOT NULL
      )`);

    // --- calendar
    await q.query(`
      CREATE TABLE schedule_template (
        id int PRIMARY KEY DEFAULT 1 CONSTRAINT "CHK_schedule_template_single" CHECK (id = 1),
        weekday jsonb NOT NULL,
        friday jsonb NOT NULL,
        shabbat jsonb NOT NULL
      )`);
    await q.query(`
      INSERT INTO schedule_template (id, weekday, friday, shabbat) VALUES (1,
        '{"shacharit": null, "mincha": null, "maariv": null}',
        '{"shacharit": null, "mincha": null, "maariv": null}',
        '{"shacharit": null, "mincha": null, "maariv": null}')`);

    await q.query(`
      CREATE TABLE schedule_overrides (
        date date PRIMARY KEY,
        shacharit varchar(5),
        mincha varchar(5),
        maariv varchar(5),
        note jsonb
      )`);

    // --- requests
    await q.query(`
      CREATE TABLE requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        type varchar(30) NOT NULL CONSTRAINT "CHK_requests_type" CHECK (type IN
          ('prayer', 'excursion', 'appointment', 'rabbi_question', 'help', 'volunteer')),
        payload jsonb NOT NULL DEFAULT '{}',
        contact_name varchar(200) NOT NULL,
        contact_phone varchar(50),
        contact_email varchar(254),
        status varchar(20) NOT NULL DEFAULT 'new'
          CONSTRAINT "CHK_requests_status" CHECK (status IN ('new', 'in_progress', 'done', 'rejected')),
        admin_note text,
        idempotency_key varchar(100) CONSTRAINT "UQ_requests_idempotency_key" UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(
      `CREATE INDEX "IDX_requests_type_status" ON requests (type, status)`
    );

    await q.query(`
      CREATE TABLE event_registrations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL CONSTRAINT "FK_event_registrations_event" REFERENCES events(id) ON DELETE CASCADE,
        name varchar(200) NOT NULL,
        phone varchar(50) NOT NULL,
        email varchar(254),
        seats int NOT NULL DEFAULT 1 CONSTRAINT "CHK_event_registrations_seats" CHECK (seats > 0),
        status varchar(20) NOT NULL DEFAULT 'new'
          CONSTRAINT "CHK_event_registrations_status" CHECK (status IN ('new', 'confirmed', 'canceled')),
        payment_id uuid,
        idempotency_key varchar(100) CONSTRAINT "UQ_event_registrations_idempotency_key" UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(
      `CREATE INDEX "IDX_event_registrations_event_id" ON event_registrations (event_id)`
    );

    await q.query(`
      CREATE TABLE yahrzeit_reminders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id uuid NOT NULL CONSTRAINT "FK_yahrzeit_reminders_request" REFERENCES requests(id) ON DELETE CASCADE,
        deceased_name varchar(200) NOT NULL,
        father_name varchar(200),
        death_date date NOT NULL,
        hebrew_day int,
        hebrew_month varchar(30),
        email varchar(254),
        phone varchar(50),
        by_email boolean NOT NULL DEFAULT false,
        by_phone boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(
      `CREATE INDEX "IDX_yahrzeit_reminders_request_id" ON yahrzeit_reminders (request_id)`
    );

    await q.query(`
      CREATE TABLE subscribers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(200) NOT NULL,
        email varchar(254) NOT NULL CONSTRAINT "UQ_subscribers_email" UNIQUE,
        lives_in_city boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);

    // --- payments
    await q.query(`
      CREATE TABLE payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        purpose varchar(20) NOT NULL
          CONSTRAINT "CHK_payments_purpose" CHECK (purpose IN ('donation', 'prayer', 'event')),
        amount_rub int NOT NULL CONSTRAINT "CHK_payments_amount" CHECK (amount_rub > 0),
        fundraiser_id uuid CONSTRAINT "FK_payments_fundraiser" REFERENCES fundraisers(id) ON DELETE SET NULL,
        request_id uuid CONSTRAINT "FK_payments_request" REFERENCES requests(id) ON DELETE SET NULL,
        registration_id uuid CONSTRAINT "FK_payments_registration" REFERENCES event_registrations(id) ON DELETE SET NULL,
        donor_name varchar(200),
        anonymous boolean NOT NULL DEFAULT false,
        email varchar(254),
        phone varchar(50),
        comment text,
        dedication text,
        dedication_visible boolean NOT NULL DEFAULT false,
        recurring boolean NOT NULL DEFAULT false,
        status varchar(20) NOT NULL DEFAULT 'pending'
          CONSTRAINT "CHK_payments_status" CHECK (status IN ('pending', 'paid', 'canceled', 'failed')),
        provider_payment_id varchar(100) CONSTRAINT "UQ_payments_provider_payment_id" UNIQUE,
        access_token varchar(64) NOT NULL,
        idempotency_key varchar(100) CONSTRAINT "UQ_payments_idempotency_key" UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        paid_at timestamptz
      )`);
    await q.query(
      `CREATE INDEX "IDX_payments_fundraiser_id" ON payments (fundraiser_id)`
    );
    await q.query(`
      ALTER TABLE event_registrations ADD CONSTRAINT "FK_event_registrations_payment"
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL`);

    await q.query(`
      CREATE TABLE recurring_donations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id uuid NOT NULL CONSTRAINT "FK_recurring_donations_payment" REFERENCES payments(id) ON DELETE CASCADE,
        amount_rub int NOT NULL CONSTRAINT "CHK_recurring_donations_amount" CHECK (amount_rub > 0),
        email varchar(254) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'active'
          CONSTRAINT "CHK_recurring_donations_status" CHECK (status IN ('active', 'canceled')),
        cancel_token varchar(64) NOT NULL CONSTRAINT "UQ_recurring_donations_cancel_token" UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE event_registrations DROP CONSTRAINT "FK_event_registrations_payment"`
    );
    for (const table of [
      'recurring_donations',
      'payments',
      'subscribers',
      'yahrzeit_reminders',
      'event_registrations',
      'requests',
      'schedule_overrides',
      'schedule_template',
      'site_settings',
      'photos',
      'albums',
      'departments',
      'programs',
      'fundraisers',
      'events',
      'news',
    ]) {
      await q.query(`DROP TABLE ${table}`);
    }
  }
}
