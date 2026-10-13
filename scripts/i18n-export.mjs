/**
 * Все тексты сайта (ru / en / he) → xlsx для вычитки иврита носителем.
 *   npm run i18n:export [-- <файл.xlsx>] [--with-decor] [--with-dynamic] [--with-technical] [--all]
 *   (по умолчанию ~/Downloads/klg-synagogue-texts-he-review.xlsx)
 * По умолчанию в файл не попадают: декоративные надписи (фоновые слова «Созвездия», бегущая строка
 * приветствий; `--with-decor`), данные из БД/админки — сиды, демо-моки, строки только в БД
 * (`--with-dynamic`), техничка без переводимого смысла — плейсхолдеры, формулы, коды, единицы, бренды
 * (`--with-technical`). `--all` возвращает всё.
 * Правки возвращаются в код командой `npm run i18n:he-import -- <файл.xlsx>`.
 */
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

import { collectRows, ROOT } from './i18n/texts.mjs';

const ExcelJS = createRequire(path.join(ROOT, 'package.json'))('exceljs');

export const COLS = {
  n: '№',
  section: 'Раздел / страница',
  key: 'Ключ',
  ru: 'Русский',
  en: 'English',
  he: 'עברית — сейчас на сайте',
  fix: 'עברית — исправление',
  comment: 'Комментарий',
};

const args = process.argv.slice(2);
const all_ = args.includes('--all');
const withDecor = all_ || args.includes('--with-decor');
const withDynamic = all_ || args.includes('--with-dynamic');
const withTechnical = all_ || args.includes('--with-technical');
const out =
  args.find((a) => !a.startsWith('--')) ?? path.join(os.homedir(), 'Downloads', 'klg-synagogue-texts-he-review.xlsx');

const FILL = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const YELLOW = FILL('FFFFF9C4');
const UNTRANSLATED = FILL('FFFFD7D2');
const HEAD = FILL('FF1F3A5F');

const all = await collectRows({ warn: (m) => console.warn(`! ${m}`) });
/** Исключаемые категории; строка относится к первой подходящей (для подсчёта). */
const SKIP = [
  { flag: 'dynamic', on: withDynamic, opt: '--with-dynamic',
    why: 'данные из БД и админки — новости (в т. ч. из Telegram), афиша, сборы, программы, подразделения, альбомы и подписи фото, настройки; сиды и демо-записи «Пример». Их переводят в админке при публикации' },
  { flag: 'technical', on: withTechnical, opt: '--with-technical',
    why: 'строки без переводимого смысла — одни плейсхолдеры и формулы ({{seats}} × {{price}} = {{total}}), коды и самоназвания языков (RU, English, עברית), сокращения единиц (м, мин, с), названия-бренды, одинаковые на всех языках (Google Maps, STARS)' },
  { flag: 'decorative', on: withDecor, opt: '--with-decor',
    why: 'декоративные надписи — фоновые ивритские слова, бегущая строка приветствий «Шалом · Shalom · שלום…», подсказка «Листайте»' },
];
const skipOf = (r) => SKIP.find((c) => !c.on && r[c.flag]);
const rows = all.filter((r) => !skipOf(r));
for (const c of SKIP) c.n = all.filter((r) => skipOf(r) === c).length;
const skipped = SKIP.filter((c) => c.n);

const wb = new ExcelJS.Workbook();
wb.creator = 'klg-synagogue i18n:export';
wb.created = new Date();

/* ─── Тексты ─── */
const ws = wb.addWorksheet('Тексты', {
  views: [{ state: 'frozen', xSplit: 3, ySplit: 1, zoomScale: 100 }],
});
ws.columns = [
  { header: COLS.n, key: 'n', width: 6 },
  { header: COLS.section, key: 'section', width: 30 },
  { header: COLS.key, key: 'key', width: 34 },
  { header: COLS.ru, key: 'ru', width: 48 },
  { header: COLS.en, key: 'en', width: 48 },
  { header: COLS.he, key: 'he', width: 48 },
  { header: COLS.fix, key: 'fix', width: 48 },
  { header: COLS.comment, key: 'comment', width: 30 },
];
const head = ws.getRow(1);
head.height = 30;
head.eachCell((c) => {
  c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  c.fill = HEAD;
  c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
});
const rtl = { wrapText: true, vertical: 'top', horizontal: 'right', readingOrder: 'rtl' };
const ltr = { wrapText: true, vertical: 'top' };
rows.forEach((r, i) => {
  const row = ws.addRow({ n: i + 1, section: r.section, key: r.key, ru: r.ru, en: r.en, he: r.he, fix: '', comment: '' });
  row.eachCell({ includeEmpty: true }, (c, col) => {
    c.alignment = col === 6 || col === 7 ? rtl : ltr;
    if (col === 3) c.font = { color: { argb: 'FF6B7280' }, size: 9 };
  });
  row.getCell(7).fill = YELLOW;
  if (r.untranslated) {
    for (const col of [1, 2, 3, 4, 5, 6]) row.getCell(col).fill = UNTRANSLATED;
  }
});
ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: 8 } };

/* ─── Как заполнять ─── */
const untranslated = rows.filter((r) => r.untranslated).length;
const guide = wb.addWorksheet('Как заполнять');
guide.columns = [{ width: 4 }, { width: 120 }];
const lines = [
  ['', 'Как заполнять таблицу (лист «Тексты»)'],
  ['1', 'Иврит на сайте — машинный перевод. Пожалуйста, проверьте столбец «עברית — сейчас на сайте» и, если текст нужно поправить, впишите исправленный вариант целиком в жёлтый столбец «עברית — исправление». Остальные столбцы не меняйте — по «Ключу» правка возвращается на сайт.'],
  ['2', 'Если перевод верный — оставьте жёлтую ячейку пустой. Вопросы и пояснения — в столбец «Комментарий».'],
  ['3', 'Плейсхолдеры в фигурных скобках — {{n}}, {{count}}, {count}, $t(site.name) — не переводите и не удаляйте: вместо них сайт подставит число, дату или имя. В исправлении они должны остаться в том же виде (порядок внутри фразы можно менять). Строку, где плейсхолдер потерян, импорт пропустит.'],
  ['4', 'Имя Бога полностью не пишем: только ה׳, השם, ד׳ или אלוקים (через ק).'],
  ['5', 'Термины (Шаббат, Кадиш, йорцайт, миква, кашрут, Тора, Ми шеберах и т. п.) пишите так, как принято в общине: שבת, קדיש, יארצייט, מקווה, כשרות, תורה, מי שברך. Если в разных строках один термин написан по-разному — исправьте на единый вариант во всех строках.'],
  ['6', `Строки, подсвеченные розовым, — без перевода: иврит пуст или совпадает с русским (например, заглушки «где парковаться»). Их нужно перевести. ${withTechnical ? 'Розовые строки с названиями (STARS, Google Maps, RU/EN) можно оставить как есть.' : 'Строка со словами и плейсхолдером (например, «{{n}} мин чтения») переводится целиком.'}`],
  ['7', 'Строки с пометкой «заглушка [ВПИШИ]» — места, где факт ещё не известен (реквизиты, часы и т. п.). Переведите только пояснение в скобках, сама пометка [ВПИШИ: …] остаётся.'],
  ['8', `Строки «…italic» — слово, которое на сайте выделяется курсивом; оно должно в точности совпадать со словом из заголовка в соседней строке «…title».${withDecor ? ' Строки «Созвездие»: в RU/EN — смысл слова, в иврите — само слово, оно висит фоном за разделом.' : ''}`],
  ['', ''],
  ['', 'Не включено в таблицу:'],
  ...skipped.map((c) => ['•', `${c.why} — ${c.n} строк.`]),
  ['', 'Новости из Telegram-канала общины публикуются только на русском.'],
  ['', `Всего строк: ${rows.length}, без перевода на иврит: ${untranslated}. Файл собран ${new Date().toLocaleDateString('ru-RU')} командой npm run i18n:export.`],
];
for (const l of lines) {
  const r = guide.addRow(l);
  r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  r.getCell(1).alignment = { vertical: 'top' };
}
guide.getRow(1).font = { bold: true, size: 14 };

/* ─── Источники ─── */
const src = wb.addWorksheet('Источники');
src.columns = [
  { header: 'Источник', width: 50 },
  { header: 'Строк', width: 10 },
  { header: 'Без перевода', width: 14 },
];
src.getRow(1).font = { bold: true };
const bySource = new Map();
for (const r of rows) {
  const s = bySource.get(r.sourceLabel) ?? [0, 0];
  s[0]++;
  if (r.untranslated) s[1]++;
  bySource.set(r.sourceLabel, s);
}
for (const [k, [n, u]] of bySource) src.addRow([k, n, u]);
src.addRow(['Итого', rows.length, untranslated]).font = { bold: true };
for (const c of skipped) src.addRow([`Не включено: ${c.why} (вернуть: ${c.opt})`, c.n, '']);
src.getColumn(1).alignment = { wrapText: true, vertical: 'top' };
src.getColumn(1).width = 90;

await wb.xlsx.writeFile(out);
console.log(`${out}: ${rows.length} строк, без перевода ${untranslated}${skipped.map((c) => `, ${c.flag} не включено ${c.n}`).join('')}`);
for (const [k, [n, u]] of bySource) console.log(`  ${k}: ${n} (без перевода ${u})`);
