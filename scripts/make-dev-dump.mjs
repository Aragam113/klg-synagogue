#!/usr/bin/env node
/**
 * `npm run dev:dump` — снимок текущей dev-БД для архива: dev-data/db.sql + dev-data/uploads.
 * Источник — БД из backend/.env (системный PostgreSQL), pg_dump из PATH (или PG_BIN).
 * Чистка идёт во временном встроенном кластере (исходная БД не меняется): убираются артефакты смоуков —
 * заявки, подписчики, регистрации, йорцайты, регулярные и все платежи, кроме демо (idempotency_key demo-*).
 * Учётки админов живут в env (ADMIN_USERS), в БД их нет — это проверяется.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BACKEND, DB_NAME, DB_USER, DUMP, DUMP_UPLOADS,
  c, ensureRootDeps, freePort, initCluster, pgClient, restoreDump, startPg, step, stopPg,
} from './dev/lib.mjs';

const CLEANUP = `
DELETE FROM payments WHERE idempotency_key IS NULL OR idempotency_key NOT LIKE 'demo-%';
DELETE FROM recurring_donations;
DELETE FROM yahrzeit_reminders;
DELETE FROM requests;
DELETE FROM event_registrations;
DELETE FROM subscribers;
`;

const env = Object.fromEntries(
  readFileSync(path.join(BACKEND, '.env'), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()])
);
const exe = (name) => (process.env.PG_BIN ? path.join(process.env.PG_BIN, name) : name);

function pgDump(args, password) {
  const r = spawnSync(exe('pg_dump'), args, { env: { ...process.env, PGPASSWORD: password }, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`pg_dump: ${r.stderr || r.error?.message}`);
}

const DUMP_FLAGS = ['--no-owner', '--no-privileges', '--inserts', '--rows-per-insert=100', '--encoding=UTF8'];

async function main() {
  ensureRootDeps();
  const tmp = path.join(os.tmpdir(), `klg-devdump-${process.pid}`);
  const raw = path.join(tmp, 'raw.sql');
  mkdirSync(tmp, { recursive: true });
  step(`pg_dump ${env.DB_DATABASE}@${env.DB_HOST}:${env.DB_PORT}…`);
  pgDump(
    ['-h', env.DB_HOST, '-p', env.DB_PORT, '-U', env.DB_USERNAME, '-d', env.DB_DATABASE, ...DUMP_FLAGS, '-f', raw],
    env.DB_PASSWORD
  );

  const dir = path.join(tmp, 'pg');
  const port = await freePort(54400);
  const password = await initCluster(dir);
  await startPg(port, dir);
  try {
    step('Чищу артефакты смоуков во временной копии…');
    await restoreDump(port, password, raw);
    const db = pgClient(port, password);
    await db.connect();
    await db.query(CLEANUP);
    const cols = await db.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema='public' AND column_name ~* '(password|passwd|pwd|secret|token|hash)'`
    );
    const leftovers = cols.rows.filter((r) => !(r.table_name === 'payments' && r.column_name === 'access_token') &&
      !(r.table_name === 'recurring_donations' && r.column_name === 'cancel_token'));
    if (leftovers.length) throw new Error(`Колонки с секретами в БД: ${JSON.stringify(leftovers)}`);
    const counts = (
      await db.query(`SELECT
        (SELECT count(*) FROM news) news, (SELECT count(*) FROM events) events,
        (SELECT count(*) FROM fundraisers) fundraisers, (SELECT count(*) FROM payments) payments,
        (SELECT count(*) FROM albums) albums, (SELECT count(*) FROM photos) photos`)
    ).rows[0];
    const files = new Set();
    for (const q of [
      'SELECT cover AS f FROM news', `SELECT jsonb_array_elements(images)->>'url' AS f FROM news`,
      'SELECT cover AS f FROM events', 'SELECT cover AS f FROM fundraisers', 'SELECT cover AS f FROM programs',
      'SELECT cover AS f FROM departments', 'SELECT cover AS f FROM albums', 'SELECT file AS f FROM photos',
    ])
      for (const { f } of (await db.query(q)).rows) if (f?.startsWith('/media/')) files.add(f.slice(7));
    await db.end();

    step('Пишу dev-data/db.sql…');
    mkdirSync(path.dirname(DUMP), { recursive: true });
    pgDump(['-h', '127.0.0.1', '-p', String(port), '-U', DB_USER, '-d', DB_NAME, ...DUMP_FLAGS, '-f', DUMP], password);
    const header = `-- Dev-снимок БД сайта синагоги (npm run dev:dump, ${new Date().toISOString()}).\n-- Восстанавливается npm start / npm run reset. Без заявок, подписчиков и тестовых платежей.\n`;
    writeFileSync(DUMP, header + readFileSync(DUMP, 'utf8'));

    rmSync(DUMP_UPLOADS, { recursive: true, force: true });
    mkdirSync(DUMP_UPLOADS, { recursive: true });
    let missing = 0;
    for (const f of files) {
      const src = path.join(BACKEND, env.UPLOAD_DIR || 'uploads', f);
      if (!existsSync(src)) {
        missing++;
        continue;
      }
      mkdirSync(path.dirname(path.join(DUMP_UPLOADS, f)), { recursive: true });
      copyFileSync(src, path.join(DUMP_UPLOADS, f));
    }
    const mb = (statSync(DUMP).size / 1048576).toFixed(1);
    console.log(
      c.green(`\ndev-data готов: db.sql ${mb} МБ, картинок ${files.size - missing}${missing ? ` (нет ${missing})` : ''}`),
      counts
    );
  } finally {
    await stopPg(dir);
    rmSync(tmp, { recursive: true, force: true });
  }

}

main().catch((e) => {
  console.error(c.red(e.stack || e.message));
  process.exit(1);
});
