#!/usr/bin/env node
/**
 * `npm run dev:archive [-- <путь.zip>]` — личный dev-архив для запуска на другом компьютере (`npm start`).
 * Состав: всё отслеживаемое git плюс новые неигнорируемые файлы рабочего дерева, заметки *.md из корня и docs/adr,
 * dev-data/ (дамп БД + картинки; свежий — `npm run dev:dump`), README-DEV.md.
 * Без: node_modules, служебных папок с точкой в корне (кроме .github), .env, backend/uploads, frontend/e2e/shots, dist, .devdata, DEV-LOGIN.txt.
 * По умолчанию — ~/Downloads/klg-synagogue-dev.zip. Zip пишется своим кодом (zlib), без внешних утилит.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import { DUMP, ROOT, c, step } from './dev/lib.mjs';

const OUT = path.resolve(process.argv[2] || path.join(os.homedir(), 'Downloads', 'klg-synagogue-dev.zip'));
const TOP = 'klg-synagogue';
const EXCLUDE = [
  /(^|\/)node_modules\//,
  /^\.(?!github\/)[^/]+\//,
  /(^|\/)\.env$/,
  /(^|\/)\.env\.(?!example$)[^/]+$/,
  /^backend\/uploads\//,
  /^frontend\/e2e\/shots\//,
  /(^|\/)dist\//,
  /^\.devdata\//,
  /^DEV-LOGIN\.txt$/,
  /(^|\/)\.expo\//,
  /(^|\/)coverage\//,
];

function walk(dir) {
  const out = [];
  for (const e of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

function fileList() {
  const git = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: ROOT,
    maxBuffer: 64 << 20,
  })
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
  const notes = readdirSync(ROOT).filter((f) => f.endsWith('.md') && statSync(path.join(ROOT, f)).isFile());
  const extra = [...notes, ...['docs/adr', 'dev-data'].flatMap((d) => (existsSync(path.join(ROOT, d)) ? walk(d) : []))];
  const files = [...new Set([...git, ...extra])].filter(
    (f) => !EXCLUDE.some((re) => re.test(f)) && existsSync(path.join(ROOT, f)) && statSync(path.join(ROOT, f)).isFile()
  );
  return files.sort();
}

/** Минимальный zip (deflate, UTF-8 имена, без zip64: архив и файлы < 4 ГБ). */
function zip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const dosTime = (d) => ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const dosDate = (d) => (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  for (const { name, data, mtime, mode } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const packed = deflateRawSync(data, { level: 9 });
    const stored = packed.length >= data.length;
    const body = stored ? data : packed;
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8
    local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt16LE(dosTime(mtime), 10);
    local.writeUInt16LE(dosDate(mtime), 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, body);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE((3 << 8) | 20, 4); // made by Unix → права (start.sh исполняемый)
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(stored ? 0 : 8, 10);
    cen.writeUInt16LE(dosTime(mtime), 12);
    cen.writeUInt16LE(dosDate(mtime), 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(body.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt32LE(((0o100000 | mode) << 16) >>> 0, 38);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);
    offset += local.length + nameBuf.length + body.length;
  }
  const cenSize = central.reduce((s, b) => s + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cenSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, ...central, end]);
}

function main() {
  if (!existsSync(DUMP)) {
    console.error(c.red('Нет dev-data/db.sql — сначала npm run dev:dump'));
    process.exit(1);
  }
  if (!existsSync(path.join(ROOT, 'README-DEV.md'))) console.warn(c.yellow('Нет README-DEV.md'));
  const files = fileList();
  step(`Упаковываю ${files.length} файлов…`);
  const exec = new Set(['start.sh']);
  const entries = files.map((f) => {
    const full = path.join(ROOT, f);
    return {
      name: `${TOP}/${f}`,
      data: readFileSync(full),
      mtime: statSync(full).mtime,
      mode: exec.has(f) || f.endsWith('.sh') ? 0o755 : 0o644,
    };
  });
  const buf = zip(entries);
  writeFileSync(OUT, buf);
  console.log(c.green(`Готово: ${OUT} — ${(buf.length / 1048576).toFixed(1)} МБ, ${files.length} файлов`));
}

main();
