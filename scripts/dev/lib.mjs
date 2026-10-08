/**
 * Общее для `npm start` / `npm run reset` / `npm run dev:dump`: встроенный PostgreSQL (бинарники npm-пакета
 * embedded-postgres, без установки), свободные порты, восстановление дампа, установка зависимостей.
 * Только встроенные модули Node на верхнем уровне: зависимости корня ставятся этим же кодом (ensureRootDeps).
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BACKEND = path.join(ROOT, 'backend');
export const FRONTEND = path.join(ROOT, 'frontend');
const IS_WIN = process.platform === 'win32';

/**
 * initdb/postgres на Windows не понимают не-ASCII в путях (кириллица уходит в cp1251 → «invalid byte sequence
 * for encoding UTF8»), а OneDrive вмешивается в файлы кластера. Такие пути для PostgreSQL обходим через кэш.
 */
const isOneDrive = (p) =>
  /[\\/]onedrive( - [^\\/]*)?([\\/]|$)/i.test(p) ||
  ['OneDrive', 'OneDriveConsumer', 'OneDriveCommercial'].some((k) => {
    const od = process.env[k];
    return od && path.resolve(p).toLowerCase().startsWith(path.resolve(od).toLowerCase());
  });
export const pgSafePath = (p) => /^[ -~]*$/.test(p) && !isOneDrive(p);
export const MOVE_HINT = IS_WIN
  ? 'Перенеси папку в путь без русских букв, например C:\\dev\\klg-synagogue'
  : 'Перенеси папку в путь без русских букв, например ~/dev/klg-synagogue';

const HOME_HINT = `${MOVE_HINT}\nили задай KLG_DEV_HOME=<папка с путём без русских букв> (например ${
  IS_WIN ? 'C:\\dev\\klg-cache' : '~/dev/klg-cache'
}) и запусти снова.`;

/** Каталог свой: настоящая папка (не симлинк/junction), на POSIX — владелец текущий пользователь. */
function trustedDir(p) {
  try {
    const st = lstatSync(p);
    return st.isDirectory() && !st.isSymbolicLink() && (IS_WIN || st.uid === process.getuid());
  } catch {
    return false;
  }
}
/** Создаёт приватный каталог (0700) и проверяет, что ему можно доверять. */
function privateDir(p) {
  mkdirSync(p, { recursive: true, mode: 0o700 });
  if (!trustedDir(p)) throw new Error(`${p} — симлинк, junction или чужой каталог; не доверяю ему.\n${HOME_HINT}`);
  return p;
}

/** Короткое 8.3-имя существующего пути (Windows); null, если его нет или оно не ASCII. */
function shortPath(p) {
  const r = spawnSync('cmd', ['/d', '/s', '/c', `"for %I in ("${p}") do @echo %~sI"`], {
    encoding: 'utf8',
    windowsVerbatimArguments: true,
    windowsHide: true,
  });
  const s = (r.stdout || '').trim();
  return r.status === 0 && s && pgSafePath(s) && existsSync(s) ? s : null;
}

/**
 * ASCII-кэш только текущего пользователя: KLG_DEV_HOME (явный выбор), иначе %LOCALAPPDATA%\klg-synagogue-dev
 * (при кириллическом имени пользователя — его 8.3-имя) или ~/.klg-synagogue-dev. Общие каталоги не используем:
 * туда можно подложить чужие бинарники PostgreSQL.
 */
let devHome;
function cacheBase() {
  if (devHome) return devHome;
  const explicit = process.env.KLG_DEV_HOME;
  if (explicit) {
    const p = path.resolve(explicit);
    if (!pgSafePath(p)) throw new Error(`KLG_DEV_HOME=${p}: путь должен быть без русских букв и вне OneDrive.`);
    return (devHome = privateDir(p));
  }
  if (IS_WIN) {
    if (!process.env.LOCALAPPDATA) throw new Error(`Не задан LOCALAPPDATA.\n${HOME_HINT}`);
    const long = privateDir(path.join(process.env.LOCALAPPDATA, 'klg-synagogue-dev'));
    const p = pgSafePath(long) ? long : shortPath(long);
    if (!p) throw new Error(`Папка пользователя ${process.env.LOCALAPPDATA} не в ASCII и у неё нет короткого 8.3-имени.\n${HOME_HINT}`);
    return (devHome = privateDir(p));
  }
  const p = path.join(os.homedir(), '.klg-synagogue-dev');
  if (!pgSafePath(p)) throw new Error(`Домашняя папка ${os.homedir()} не в ASCII.\n${HOME_HINT}`);
  return (devHome = privateDir(p));
}
let CACHE = null;
if (!pgSafePath(ROOT)) {
  try {
    CACHE = cacheBase();
  } catch (e) {
    console.error(`\x1b[31mОшибка: ${e.message}\x1b[0m`);
    process.exit(1);
  }
}
const projectKey = createHash('sha1').update(IS_WIN ? ROOT.toLowerCase() : ROOT).digest('hex').slice(0, 10);

/** Каталог данных встроенного PostgreSQL и состояния запуска: .devdata в проекте или ASCII-кэш. */
export const DEVDATA = CACHE ? path.join(CACHE, projectKey) : path.join(ROOT, '.devdata');
if (CACHE) {
  privateDir(DEVDATA);
  const note = path.join(DEVDATA, 'project.txt');
  if (!existsSync(note)) writeFileSync(note, `${ROOT}\n`, { mode: 0o600 });
}
export const PGDATA = path.join(DEVDATA, 'pg');
export const PG_LOG = path.join(DEVDATA, 'pg.log');
export const STATE = path.join(DEVDATA, 'state.json');
export const DUMP = path.join(ROOT, 'dev-data', 'db.sql');
export const DUMP_UPLOADS = path.join(ROOT, 'dev-data', 'uploads');
export const DB_NAME = 'synagogue';
export const DB_USER = 'postgres';
export const MIN_NODE = [20, 19, 4];

export const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
};
export const step = (msg) => console.log(`${c.cyan('›')} ${msg}`);

export function checkNode() {
  const have = process.versions.node.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (have[i] > MIN_NODE[i]) return;
    if (have[i] < MIN_NODE[i]) {
      console.error(
        c.red(`Нужен Node.js ≥ ${MIN_NODE.join('.')} (сейчас ${process.versions.node}).`) +
          '\nСкачайте LTS-версию с https://nodejs.org и запустите снова.'
      );
      process.exit(1);
    }
  }
}

export const readState = () => {
  try {
    return JSON.parse(readFileSync(STATE, 'utf8'));
  } catch {
    return {};
  }
};
export const writeState = (patch) => {
  mkdirSync(DEVDATA, { recursive: true, mode: 0o700 });
  writeFileSync(STATE, JSON.stringify({ ...readState(), ...patch }, null, 2), { mode: 0o600 });
};

/** На Windows npm/npx — это .cmd: запускаем через shell одной строкой (аргументы — наши, без пользовательского ввода). */
const q = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
const viaShell = (cmd, args) => (IS_WIN ? [[cmd, ...args].map(q).join(' '), []] : [cmd, args]);

export function run(cmd, args, opts = {}) {
  const [c0, a0] = viaShell(cmd, args);
  const r = spawnSync(c0, a0, { stdio: 'inherit', shell: IS_WIN, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} → код ${r.status}`);
}

export function ensureDeps(dir, label) {
  if (existsSync(path.join(dir, 'node_modules'))) return false;
  step(`Ставлю зависимости ${label} (первый запуск, пара минут)…`);
  run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: dir });
  return true;
}

export function ensureRootDeps() {
  const has = (m) => existsSync(path.join(ROOT, 'node_modules', m, 'package.json'));
  if (has('embedded-postgres') && has('pg')) return;
  step('Ставлю зависимости запускалки (встроенный PostgreSQL, ~100 МБ)…');
  run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: ROOT });
}

/** Модуль из node_modules корня (после ensureRootDeps). */
export const rootRequire = createRequire(path.join(ROOT, 'package.json'));
export const backendRequire = createRequire(path.join(BACKEND, 'package.json'));

async function canListen(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', (e) => resolve(e.code === 'EAFNOSUPPORT' || e.code === 'EADDRNOTAVAIL'));
    srv.listen({ port, host, exclusive: true }, () => srv.close(() => resolve(true)));
  });
}
async function answers(port) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: '127.0.0.1' });
    s.setTimeout(400);
    s.once('connect', () => (s.destroy(), resolve(true)));
    s.once('timeout', () => (s.destroy(), resolve(false)));
    s.once('error', () => resolve(false));
  });
}
/** Первый свободный порт начиная с `from` (пропуская `skip`). */
export async function freePort(from, skip = []) {
  for (let p = from; p < from + 200; p++) {
    if (skip.includes(p)) continue;
    if (await answers(p)) continue;
    if ((await canListen(p, '127.0.0.1')) && (await canListen(p, '::')) && (await canListen(p, '0.0.0.0'))) return p;
  }
  throw new Error(`Нет свободного порта в диапазоне ${from}…${from + 199}`);
}

/** Пути к initdb / pg_ctl из платформенного пакета embedded-postgres. */
export async function pgBinaries() {
  const plat = { win32: 'windows', darwin: 'darwin', linux: 'linux' }[process.platform];
  const arch = { x64: 'x64', arm64: 'arm64', arm: 'arm', ia32: 'ia32', ppc64: 'ppc64' }[process.arch];
  const name = `@embedded-postgres/${plat}-${arch}`;
  let mod;
  try {
    mod = await import(pathToFileURL(rootRequire.resolve(name)).href);
  } catch {
    throw new Error(`Нет бинарников PostgreSQL для ${process.platform}/${process.arch} (${name}). Удалите node_modules в корне и запустите снова.`);
  }
  const binDir = path.dirname(mod.pg_ctl);
  if (pgSafePath(binDir)) return { initdb: mod.initdb, pgCtl: mod.pg_ctl };
  const nativeDir = path.dirname(binDir);
  const { version } = JSON.parse(readFileSync(path.join(nativeDir, '..', 'package.json'), 'utf8')); // exports закрывает ./package.json
  const dir = asciiBinaries(nativeDir, version);
  return { initdb: path.join(dir, 'bin', path.basename(mod.initdb)), pgCtl: path.join(dir, 'bin', path.basename(mod.pg_ctl)) };
}

/**
 * Рекурсивная копия на readdir/copyFile. fs.cpSync не используем: в Node 24 на Windows он молча роняет процесс
 * (код 127), если в исходном пути есть кириллица. Симлинки разыменовываются; force=false не трогает существующие.
 */
export function copyTree(src, dest, { force = true } = {}) {
  mkdirSync(dest, { recursive: true });
  for (const e of readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, e.name);
    const to = path.join(dest, e.name);
    if (statSync(from).isDirectory()) copyTree(from, to, { force });
    else if (force || !existsSync(to)) copyFileSync(from, to);
  }
}

/** Один раз копирует native/{bin,lib,share} в ASCII-кэш: initdb ищет share относительно своего exe. */
function asciiBinaries(nativeDir, version) {
  const pgBin = privateDir(path.join(CACHE || cacheBase(), 'pg-bin'));
  const dest = path.join(pgBin, `${process.platform}-${process.arch}-${version}`);
  const done = path.join(dest, '.complete');
  const isFile = (p) => {
    try {
      const st = lstatSync(p);
      return st.isFile() && !st.isSymbolicLink() && (IS_WIN || st.uid === process.getuid());
    } catch {
      return false;
    }
  };
  // маркеру верим, только если и он, и все папки — настоящие и свои (не подложенные симлинки/junction)
  if (isFile(done) && [dest, ...['bin', 'lib', 'share'].map((s) => path.join(dest, s))].every(trustedDir)) return dest;
  step(`Копирую бинарники PostgreSQL в ${dest} (путь проекта не ASCII, один раз)…`);
  const tmp = `${dest}.tmp-${process.pid}`;
  rmSync(tmp, { recursive: true, force: true });
  for (const sub of ['bin', 'lib', 'share'])
    if (existsSync(path.join(nativeDir, sub)))
      copyTree(path.join(nativeDir, sub), path.join(tmp, sub));
  writeFileSync(path.join(tmp, '.complete'), `${nativeDir}\n`, { mode: 0o600 });
  rmSync(dest, { recursive: true, force: true });
  renameSync(tmp, dest);
  return dest;
}

const pgEnv = () => ({ ...process.env, LC_MESSAGES: 'C', LANG: 'C' });

/** Свежий кластер в PGDATA (ASCII-путь); пароль суперпользователя сохраняется в state. */
export async function initCluster(dir = PGDATA) {
  const { initdb } = await pgBinaries();
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(path.dirname(dir), { recursive: true, mode: 0o700 });
  const password = randomBytes(12).toString('hex');
  const pwfile = path.join(path.dirname(dir), 'pw.tmp');
  writeFileSync(pwfile, password, { mode: 0o600 });
  const r = spawnSync(
    initdb,
    ['-D', dir, '-U', DB_USER, `--pwfile=${pwfile}`, '--auth=scram-sha-256', '-E', 'UTF8', '--locale=C'],
    { env: pgEnv(), encoding: 'utf8' }
  );
  rmSync(pwfile, { force: true });
  if (r.status !== 0)
    throw new Error(`initdb не смог создать кластер:\n${r.stderr || r.stdout || r.error?.message}${pathHint(dir)}`);
  if (dir === PGDATA) writeState({ pgPassword: password, restoredAt: null });
  return password;
}

/** Подсказка к ошибке PostgreSQL, если в деле не-ASCII путь проекта (кэш мог не спасти). */
const pathHint = (dir) => (pgSafePath(dir) && pgSafePath(ROOT) ? '' : `\n\n${MOVE_HINT}`);

const logFile = (dir) => (dir === PGDATA ? PG_LOG : `${dir}.log`);

/** Запуск postgres на 127.0.0.1:port (pg_ctl -w ждёт готовности). */
export async function startPg(port, dir = PGDATA) {
  const { pgCtl } = await pgBinaries();
  // свой порт и только localhost; без unix-сокетов (на macOS путь каталога сокета может не существовать)
  writeFileSync(
    path.join(dir, 'postgresql.auto.conf'),
    `# managed by scripts/dev/lib.mjs\nport = ${port}\nlisten_addresses = '127.0.0.1'\nunix_socket_directories = ''\n`
  );
  spawnSync(pgCtl, ['stop', '-D', dir, '-m', 'fast', '-w'], { env: pgEnv(), stdio: 'ignore' }); // хвост прошлого запуска
  const r = spawnSync(pgCtl, ['start', '-D', dir, '-l', logFile(dir), '-w', '-t', '60'], {
    env: pgEnv(),
    stdio: 'ignore',
    windowsHide: true,
  });
  if (r.status !== 0) {
    const log = existsSync(logFile(dir)) ? readFileSync(logFile(dir), 'utf8').split('\n').slice(-15).join('\n') : '';
    throw new Error(`PostgreSQL не запустился (код ${r.status}). Конец ${logFile(dir)}:\n${log}${pathHint(dir)}`);
  }
}

export async function stopPg(dir = PGDATA) {
  const { pgCtl } = await pgBinaries();
  spawnSync(pgCtl, ['stop', '-D', dir, '-m', 'fast', '-w', '-t', '30'], { env: pgEnv(), stdio: 'ignore' });
}

export function pgClient(port, password, database = DB_NAME) {
  const { Client } = rootRequire('pg');
  return new Client({ host: '127.0.0.1', port, user: DB_USER, password, database });
}

/** Создаёт БД и заливает dev-data/db.sql (plain SQL с INSERT; мета-команды psql пропускаются). */
export async function restoreDump(port, password, dumpFile = DUMP) {
  const admin = pgClient(port, password, 'postgres');
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${DB_NAME} ENCODING 'UTF8' TEMPLATE template0`);
  await admin.end();
  const sql = readFileSync(dumpFile, 'utf8')
    .split(/\r?\n/)
    .filter((l) => !l.startsWith('\\'))
    .join('\n');
  const db = pgClient(port, password);
  await db.connect();
  try {
    await db.query(sql);
  } finally {
    await db.end();
  }
}

/** Убить процесс вместе с потомками. */
export function killTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (IS_WIN) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }
}

/** Долгоживущий процесс с префиксом в выводе; строки-шум отфильтровываются. */
export function startChild(label, color, cmd, args, opts, drop = () => false) {
  const [c0, a0] = viaShell(cmd, args);
  const child = spawn(c0, a0, { shell: IS_WIN, detached: !IS_WIN, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
  const prefix = color(`[${label}]`);
  for (const stream of [child.stdout, child.stderr]) {
    let buf = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      buf += chunk;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const line of lines) if (line.trim() && !drop(line)) console.log(`${prefix} ${line}`);
    });
  }
  return child;
}

export async function waitHttp(url, timeoutMs, isAlive = () => true) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (!isAlive()) return false;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.status < 500) return true;
    } catch {
      /* ещё не поднялся */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

export function openBrowser(url) {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '""', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true, windowsHide: true }).unref();
  } catch {
    /* браузер откроют руками */
  }
}
