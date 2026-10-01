import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } from './setup-env';

export { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD };

export interface TestAppOptions {
  /** Дополнительные модули (например, тестовые контроллеры). */
  imports?: ModuleMetadata['imports'];
  /** Подмена провайдеров: `b => b.overrideProvider(X).useValue(y)`. */
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}

/** Поднимает приложение целиком (как main.ts, без listen) на БД synagogue_test. */
export async function createTestApp(
  opts: TestAppOptions = {}
): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    imports: [AppModule, ...(opts.imports ?? [])],
  });
  if (opts.override) builder = opts.override(builder);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication({
    logger: ['error'],
    rawBody: true,
  });
  configureApp(app);
  await app.init();
  return app;
}

/** Таблицы, которые resetDb не очищает: журнал миграций и единственная строка шаблона. */
const KEEP_TABLES = ['migrations', 'schedule_template'];

/**
 * Очищает все таблицы схемы public (список — из information_schema, новые таблицы
 * будущих миграций попадают сюда сами); шаблон расписания (id=1) сбрасывается в пустой.
 */
export async function resetDb(app: INestApplication): Promise<void> {
  const db = app.get(DataSource);
  const rows: { table_name: string }[] = await db.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        AND NOT (table_name = ANY($1))`,
    [KEEP_TABLES]
  );
  const tables = rows.map((r) => `"${r.table_name}"`).join(', ');
  if (tables) await db.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
  const empty = '{"shacharit": null, "mincha": null, "maariv": null}';
  await db.query(
    `UPDATE schedule_template SET weekday = $1, friday = $1, shabbat = $1 WHERE id = 1`,
    [empty]
  );
}

/** JWT редактора через настоящий POST /admin/login. */
export async function adminToken(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/admin/login')
    .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
    .expect(200);
  return res.body.data.token as string;
}
