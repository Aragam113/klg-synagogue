#!/usr/bin/env node
/**
 * `npm start` — сайт целиком одной командой: встроенный PostgreSQL + API (NestJS) + web (Expo).
 * Данные PostgreSQL — в .devdata/pg, а если путь проекта не ASCII или в OneDrive — в ASCII-кэше
 * (%LOCALAPPDATA%\klg-synagogue-dev\<хеш> или ~/.klg-synagogue-dev/<хеш>), см. DEVDATA в dev/lib.mjs.
 * Первый запуск: зависимости, кластер БД, восстановление dev-data/db.sql, backend/.env с dev-админом, картинки.
 * Повторный — без переустановки и восстановления. Ctrl+C гасит всё, включая PostgreSQL.
 * `npm run reset` (= этот файл с --reset) — вернуть данные к дампу.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import {
  BACKEND, DB_NAME, DB_USER, DUMP, DUMP_UPLOADS, FRONTEND, PGDATA, ROOT,
  backendRequire, c, checkNode, copyTree, ensureDeps, ensureRootDeps, freePort, initCluster, killTree, openBrowser,
  readState, restoreDump, run, startChild, startPg, step, stopPg, waitHttp, writeState,
} from './dev/lib.mjs';

const RESET = process.argv.includes('--reset');
const ENV_FILE = path.join(BACKEND, '.env');
const LOGIN_FILE = path.join(ROOT, 'DEV-LOGIN.txt');
const ADMIN_EMAIL = 'admin@dev.local';
const today = () => new Date().toISOString().slice(0, 10);

/** Обновить/добавить ключи в .env, не трогая остальное. */
function setEnvKeys(file, values) {
  let text = readFileSync(file, 'utf8');
  for (const [k, v] of Object.entries(values)) {
    const re = new RegExp(`^${k}=.*$`, 'm');
    text = re.test(text) ? text.replace(re, () => `${k}=${v}`) : `${text.trimEnd()}\n${k}=${v}\n`;
  }
  writeFileSync(file, text);
}

/** backend/.env из .env.example: случайный JWT_SECRET, dev-админ, встроенный Postgres, fake-касса. */
function ensureEnv() {
  if (existsSync(ENV_FILE)) return null;
  step('Создаю backend/.env (dev-админ, случайный JWT_SECRET)…');
  const password = randomBytes(9).toString('base64url');
  const hash = backendRequire('bcrypt').hashSync(password, 10);
  copyFileSync(path.join(BACKEND, '.env.example'), ENV_FILE);
  setEnvKeys(ENV_FILE, {
    NODE_ENV: 'development',
    JWT_SECRET: randomBytes(32).toString('hex'),
    ADMIN_USERS: `${ADMIN_EMAIL}:${hash}`,
    PAYMENT_MODE: 'fake',
    UPLOAD_DIR: './uploads',
    DB_HOST: '127.0.0.1',
    DB_USERNAME: DB_USER,
    DB_DATABASE: DB_NAME,
  });
  writeFileSync(
    ENV_FILE,
    `${readFileSync(ENV_FILE, 'utf8').trimEnd()}\n\n# Dev-админ (создан npm start, только для этого компьютера): ${ADMIN_EMAIL} / ${password}\n`
  );
  return password;
}

function writeLogin(password) {
  writeFileSync(
    LOGIN_FILE,
    [
      'Вход в админку локальной копии сайта (создано npm start, пароль случайный и только для этого компьютера).',
      '',
      `Логин:  ${ADMIN_EMAIL}`,
      `Пароль: ${password}`,
      '',
      'Адрес админки печатается при запуске (http://localhost:<порт сайта>/admin).',
      'Сменить пароль: удалите backend/.env и запустите npm start снова — создастся новый.',
      '',
    ].join('\n'),
    { mode: 0o600 }
  );
}

/** Картинки новостей и альбомов: dev-data/uploads → backend/uploads (существующие не трогаются, если не reset). */
function copyUploads(force) {
  if (!existsSync(DUMP_UPLOADS)) return;
  const dest = path.join(BACKEND, 'uploads');
  mkdirSync(dest, { recursive: true });
  const before = readdirSync(dest).length;
  copyTree(DUMP_UPLOADS, dest, { force });
  const n = readdirSync(dest).length;
  if (force || n !== before) step(`Картинки: ${n} файлов в backend/uploads`);
}

async function restore(pgPort) {
  if (!existsSync(DUMP)) throw new Error(`Нет дампа ${path.relative(ROOT, DUMP)}`);
  const inRoot = !path.relative(ROOT, PGDATA).startsWith('..');
  step(`Создаю кластер PostgreSQL в ${inRoot ? path.relative(ROOT, PGDATA) : `${PGDATA} (путь проекта не ASCII или в OneDrive)`}…`);
  const password = await initCluster();
  await startPg(pgPort);
  step('Восстанавливаю данные из dev-data/db.sql…');
  await restoreDump(pgPort, password);
  copyUploads(true);
  writeState({ restoredAt: new Date().toISOString(), demoRefreshedOn: null });
  return password;
}

/** Даты демо-афиши считаются от «сегодня»: раз в день пересчитываем (npm run seed:demo). */
function refreshDemo(env) {
  if (readState().demoRefreshedOn === today()) return;
  step('Пересчитываю даты демо-афиши и сборов от сегодняшнего дня…');
  try {
    run('npm', ['run', '--silent', 'seed:demo'], { cwd: BACKEND, env, stdio: ['ignore', 'ignore', 'inherit'] });
    writeState({ demoRefreshedOn: today() });
  } catch (e) {
    console.warn(c.yellow(`  не получилось (${e.message}) — сайт работает с датами из дампа`));
  }
}

async function main() {
  checkNode();
  console.log(c.bold('\nСинагога Калининграда — локальная копия сайта\n'));
  ensureRootDeps();
  const pgPort = await freePort(54329);

  if (RESET) {
    await stopPg().catch(() => {});
    await restore(pgPort);
    await stopPg();
    console.log(c.green('\nДанные возвращены к дампу. Запуск: npm start\n'));
    return;
  }

  ensureDeps(BACKEND, 'бэкенда');
  ensureDeps(FRONTEND, 'сайта');
  const newPassword = ensureEnv();
  if (newPassword) writeLogin(newPassword);

  let state = readState();
  let pgPassword = state.pgPassword;
  if (!pgPassword || !existsSync(path.join(PGDATA, 'PG_VERSION')) || !state.restoredAt) {
    pgPassword = await restore(pgPort);
  } else {
    step(`Запускаю PostgreSQL (порт ${pgPort})…`);
    await startPg(pgPort);
    copyUploads(false);
  }
  state = readState();

  const apiPort = await freePort(3000, [pgPort]);
  const webPort = await freePort(8081, [pgPort, apiPort]);
  const api = `http://localhost:${apiPort}`;
  const web = `http://localhost:${webPort}`;
  const apiUrl = `${api}/api/v1`;
  setEnvKeys(ENV_FILE, {
    PORT: apiPort, BASE_URL: api, FRONTEND_URL: web,
    DB_HOST: '127.0.0.1', DB_PORT: pgPort, DB_USERNAME: DB_USER, DB_PASSWORD: pgPassword, DB_DATABASE: DB_NAME,
  });
  const backendEnv = {
    ...process.env, PORT: String(apiPort), BASE_URL: api, FRONTEND_URL: web,
    DB_HOST: '127.0.0.1', DB_PORT: String(pgPort), DB_USERNAME: DB_USER, DB_PASSWORD: pgPassword, DB_DATABASE: DB_NAME,
  };
  refreshDemo(backendEnv);

  const children = [];
  let stopping = false;
  const shutdown = async (code = 0) => {
    if (stopping) return;
    stopping = true;
    console.log(c.yellow('\nОстанавливаю сайт, API и PostgreSQL…'));
    for (const ch of children) killTree(ch);
    await stopPg().catch(() => {});
    console.log(c.green('Всё остановлено.'));
    process.exit(code);
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP']) process.on(sig, () => shutdown(0));

  step(`Запускаю API (порт ${apiPort}) и сайт (порт ${webPort})… первый старт API ~30–60 с`);
  const apiChild = startChild('api', c.magenta, 'npm', ['run', 'start:dev'], { cwd: BACKEND, env: backendEnv }, (l) =>
    /query( failed)?:|^\s*(query|parameters):/.test(l)
  );
  const webArgs = ['expo', 'start', '--web', '--port', String(webPort)];
  if (state.webApiUrl !== apiUrl) webArgs.push('--clear'); // EXPO_PUBLIC_* вшиваются в бандл — новый адрес API = чистый кэш
  const webChild = startChild('web', c.cyan, 'npx', webArgs, {
    cwd: FRONTEND,
    env: { ...process.env, EXPO_PUBLIC_API_URL: apiUrl, BROWSER: 'none', EXPO_NO_TELEMETRY: '1', CI: '1' },
  });
  children.push(apiChild, webChild);
  for (const [name, ch] of [['API', apiChild], ['сайт', webChild]])
    ch.on('exit', (code) => {
      if (stopping) return;
      console.error(c.red(`\n${name} завершился (код ${code}). Смотрите вывод выше.`));
      shutdown(1);
    });

  const alive = () => !stopping;
  const [apiOk, webOk] = await Promise.all([
    waitHttp(`${apiUrl}/settings/public`, 240_000, alive),
    waitHttp(`${web}/`, 240_000, alive),
  ]);
  if (stopping) return;
  if (!apiOk || !webOk) {
    console.error(c.red(`\nНе дождался ${!apiOk ? 'API' : 'сайта'} за 4 минуты.`));
    return shutdown(1);
  }
  writeState({ webApiUrl: apiUrl });
  openBrowser(web);
  console.log(
    [
      '',
      c.green(c.bold('Готово! Сайт работает:')),
      `  Сайт      ${c.bold(web)}`,
      `  Админка   ${c.bold(`${web}/admin`)}   ${ADMIN_EMAIL} / ${newPassword ? c.bold(newPassword) : c.dim('пароль в DEV-LOGIN.txt')}`,
      `  Swagger   ${c.bold(`${api}/docs`)}`,
      `  API       ${apiUrl}`,
      `  БД        postgres://${DB_USER}@127.0.0.1:${pgPort}/${DB_NAME} ${c.dim(`(пароль — DB_PASSWORD в backend/.env)`)}`,
      newPassword ? c.yellow('  Пароль админа показан один раз и сохранён в DEV-LOGIN.txt') : '',
      c.dim('  Первая загрузка страницы собирает бандл ~30–60 с. Остановить всё: Ctrl+C'),
      '',
    ]
      .filter((l) => l !== '')
      .join('\n') + '\n'
  );
}

main().catch(async (e) => {
  console.error(c.red(`\nОшибка: ${e.message}`));
  await stopPg().catch(() => {});
  process.exit(1);
});
