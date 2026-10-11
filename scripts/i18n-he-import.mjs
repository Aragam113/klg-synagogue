/**
 * Правки иврита из xlsx (столбец «עברית — исправление») → исходники сайта.
 *   npm run i18n:he-import -- <файл.xlsx> [--dry-run]
 * По «Ключу» строка находится заново (тот же сбор, что у i18n:export) и правится на месте:
 * json-неймспейсы, content/he/sections.ts, site.ts, static-pages, ghost-model, hebrew-names
 * (HE_NAME_FIXES для названий hebcal), сиды. Для данных в БД (сиды уже залиты, записи только в БД)
 * пишется миграция backend/src/shared/database/migrations/<ts>-HebrewFixes.ts.
 */
import path from 'node:path';
import { createRequire } from 'node:module';

import { applyEdits, collectRows, planEdits, ROOT } from './i18n/texts.mjs';

const ExcelJS = createRequire(path.join(ROOT, 'package.json'))('exceljs');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('Использование: npm run i18n:he-import -- <файл.xlsx> [--dry-run]');
  process.exit(2);
}

const cellText = (v) => {
  if (v == null) return '';
  if (typeof v === 'object' && Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
  if (typeof v === 'object' && 'text' in v) return String(v.text);
  if (typeof v === 'object' && 'result' in v) return String(v.result ?? '');
  return String(v);
};

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(path.resolve(process.cwd(), file));
const ws = wb.getWorksheet('Тексты') ?? wb.worksheets[0];
const header = Array.from(ws.getRow(1).values, cellText);
const colKey = header.indexOf('Ключ');
const colFix = header.findIndex((h) => h.includes('исправление'));
if (colKey < 1 || colFix < 1) {
  console.error('Не найдены столбцы «Ключ» и «… исправление» в первой строке листа «Тексты».');
  process.exit(2);
}

const fixes = [];
ws.eachRow((row, n) => {
  if (n === 1) return;
  const he = cellText(row.getCell(colFix).value).replace(/\r\n/g, '\n').trim();
  if (he) fixes.push({ key: cellText(row.getCell(colKey).value).trim(), he, line: n });
});

const rows = await collectRows({ warn: (m) => console.warn(`! ${m}`) });
const { edits, problems } = planEdits(rows, fixes);

console.log(`Правок в файле: ${fixes.length}, к применению: ${edits.length}${dryRun ? ' (dry-run, файлы не меняются)' : ''}`);
for (const e of edits) {
  const where = e.row.loc.file ?? `БД ${e.row.loc.table}`;
  console.log(`\n• ${e.key}  [${where}]\n  было:  ${e.from || '(пусто)'}\n  стало: ${e.to}`);
}
for (const p of problems) console.warn(`! ${p}`);

if (edits.length) {
  const res = applyEdits(edits, { dryRun });
  console.log(`\n${dryRun ? 'Изменились бы' : 'Изменены'} файлы: ${res.changed.join(', ') || '—'}`);
  if (res.migration)
    console.log(`${dryRun ? 'Была бы создана' : 'Создана'} миграция: ${res.migration} (${res.sqlCount} UPDATE; накатится при старте API или npm run migration:run)`);
  if (edits.some((e) => e.row.source === 'demo')) console.log('Демо-моки: перезапустите `cd backend && npm run seed:demo`.');
}
process.exit(problems.length ? 1 : 0);
