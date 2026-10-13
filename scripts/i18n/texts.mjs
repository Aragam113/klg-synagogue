/**
 * Сбор всех текстов сайта на ru/en/he для вычитки иврита и обратная запись правок.
 *
 * collectRows() → строки { key, section, ru, en, he, loc, flags }: `key` — стабильный идентификатор,
 * `loc` — где лежит ивритский текст (json-неймспейс, литерал в .ts, правки hebcal, строка БД).
 * `decorative: true` — чисто декоративные надписи (фоновые слова «Созвездия», бегущая строка приветствий,
 * подсказка «Листайте», приветствие-надпись над «Порогом»): экспорт их не пишет без `--with-decor`,
 * но collectRows() возвращает всегда — импорт старого файла с этими ключами продолжает работать.
 * Так же устроены `dynamic: true` (данные из БД/админки: сиды, демо-моки, строки только в БД; вернуть —
 * `--with-dynamic`) и `technical: true` (плейсхолдеры, формулы, числа, коды, единицы, бренды; `--with-technical`).
 * Экспорт (`i18n-export.mjs`) пишет строки в xlsx, импорт (`i18n-he-import.mjs`) собирает их заново,
 * находит строку по ключу и применяет правку через `loc` (planEdits → applyEdits).
 */
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FRONT = path.join(ROOT, 'frontend');
const BACK = path.join(ROOT, 'backend');
const reqFront = createRequire(path.join(FRONT, 'package.json'));
const reqBack = createRequire(path.join(BACK, 'package.json'));
const ts = reqFront('typescript');

const LANGS = ['ru', 'en', 'he'];
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const read = (p) => fs.readFileSync(p, 'utf8');
const hasLetters = (s) => /\p{L}/u.test(s ?? '');
const isUrl = (s) => /^(https?:|mailto:|tel:|\/)/.test(s ?? '');

/* ───────────────────────────── разделы (подписи для человека) ───────────────────────────── */

const NS_LABEL = {
  'calendar.page': 'Расписание — страница',
  'calendar.col': 'Расписание — таблица',
  'calendar.zmanim': 'Расписание — зманим',
  'calendar.widget': 'Шапка — виджет «Сегодня»',
  'calendar.holiday': 'Праздник — страница',
  'common.site': 'Шапка — название сайта',
  'common.nav': 'Шапка — меню',
  'common.lang': 'Шапка — выбор языка',
  'common.links': 'Меню — ссылки разделов',
  'common.footer': 'Подвал',
  'common.cookie': 'Cookie-баннер',
  'common.demo': 'Демо-режим — плашки',
  'common.errors': 'Ошибки — общие',
  'common.fieldErrors': 'Формы — ошибки полей',
  'common.empty': 'Пустые списки',
  'common.notFound': 'Страница 404',
  'common.example': 'Плашка «Пример»',
  'common.fallback': 'Плашка «нет перевода»',
  'common.actions': 'Кнопки — общие',
  'common.home': 'Главная — заголовок окна',
  'content.events': 'Афиша',
  'content.news': 'Новости',
  'content.fundraisers': 'Сборы',
  'content.programs': 'Программы',
  'content.departments': 'Подразделения',
  'content.gallery': 'Галерея',
  'content.search': 'Поиск',
  'content.*': 'Списки — общее',
  'forms.common': 'Формы — общее',
  'forms.fields': 'Формы — поля',
  'forms.banner': 'Формы — сообщения',
  'forms.errors': 'Формы — ошибки',
  'forms.accepted': 'Формы — заявка принята',
  'forms.prayer': 'Формы — заказать молитву',
  'forms.appointment': 'Формы — приём у раввина',
  'forms.askRabbi': 'Формы — вопрос раввину',
  'forms.help': 'Формы — нужна помощь',
  'forms.volunteer': 'Формы — стать волонтёром',
  'forms.excursion': 'Формы — запись на экскурсию',
  'forms.register': 'Формы — регистрация на событие',
  'forms.subscribe': 'Формы — подписка',
  'home.title': 'Главная — заголовок окна',
  'home.hero': 'Главная — первый экран',
  'home.scene': 'Главная — scroll-сцена',
  'home.threshold': 'Главная — «Порог»',
  'home.today': 'Главная — сегодня',
  'home.community': 'Главная — жизнь общины',
  'home.ledger': 'Главная — посвящения',
  'home.visit': 'Главная — туристам',
  'home.events': 'Главная — афиша',
  'home.funds': 'Главная — сборы',
  'home.news': 'Главная — новости',
  'home.dawn': 'Главная — финал',
  'home.loading': 'Главная — загрузка',
  'payments.purpose': 'Пожертвования — назначение',
  'payments.donate': 'Пожертвования — страница',
  'payments.form': 'Пожертвования — форма',
  'payments.slot': 'Формы — блок оплаты',
  'payments.requisites': 'Пожертвования — реквизиты',
  'payments.fundraiser': 'Сборы — страница сбора',
  'payments.thanks': 'Пожертвования — спасибо',
  'payments.devPay': 'Пожертвования — тестовая оплата',
  'sections.page': 'Разделы — заголовки страниц',
  'sections.ph': 'Разделы — заглушки',
  'sections.*': 'Разделы — подписи',
};

const CONTENT_LABEL = {
  community: 'Общине',
  visit: 'Туристам',
  'visit.hours': 'Туристам — часы работы',
  'visit.howTo': 'Туристам — как добраться',
  'visit.rules': 'Туристам — правила посещения',
  'visit.excursions': 'Туристам — экскурсии',
  'visit.museum': 'Туристам — музей',
  'visit.kosher': 'Туристам — кошерное питание',
  history: 'История',
  about: 'Об общине',
  contacts: 'Контакты',
  'legal.privacy': 'Политика конфиденциальности',
  'legal.consent': 'Согласие на обработку данных',
};
const PART_LABEL = {
  hero: 'первый экран',
  intro: 'вступление',
  cards: 'карточки',
  programs: 'программы',
  reception: 'приём',
  partners: 'партнёры',
  timeline: 'хронология',
  people: 'люди',
  trust: 'попечители',
  note: 'примечание',
};

/** Порядок разделов в таблице — по первому слову подписи. */
const ORDER = [
  'Главная', 'Шапка', 'Меню', 'Подвал', 'Cookie', 'Плашка', 'Демо-режим', 'Кнопки', 'Ошибки',
  'Пустые', 'Страница', 'Списки', 'Расписание', 'Календарь', 'Праздник', 'Общине', 'Туристам',
  'История', 'Об', 'Контакты', 'Разделы', 'Афиша', 'Новости', 'Сборы', 'Программы', 'Подразделения',
  'Галерея', 'Поиск', 'Пожертвования', 'Формы', 'Политика', 'Согласие', 'Созвездие', 'Данные', 'Демо',
];
export const sectionGroup = (label) => {
  const i = ORDER.findIndex((w) => label.startsWith(w));
  return i < 0 ? ORDER.length : i;
};

/**
 * Декоративные ключи вне источника «ghost» (тот декоративен целиком): надписи, которые не несут
 * смысла страницы — подсказка прокрутки (aria-hidden) и приветствие «Шалом · ברוכים הבאים» над «Порогом».
 */
const DECOR_KEYS = new Set(['home:hero.cue', 'home:threshold.eyebrow']);
const DECOR_SOURCES = new Set(['ghost']);
export const isDecorative = (r) => DECOR_SOURCES.has(r.source) || DECOR_KEYS.has(r.key);

/**
 * Динамика: то, что сайт берёт из API/БД и что правят в админке (новости — в т. ч. импорт из Telegram,
 * афиша, сборы, программы, подразделения, альбомы и подписи фото, примечания расписания, настройки —
 * реквизиты/оператор). Их исходники в выгрузке — сиды `content.data.ts` (только начальная заливка БД),
 * демо-моки `demo-mock.data.ts` (записи «Пример») и строки, которые есть только в БД.
 * Тексты `frontend/src/content`, i18n, site.ts, hebrew-names.ts и hebcal в админке не правятся — статика.
 */
const DYNAMIC_SOURCES = new Set(['seed', 'demo', 'db']);
export const isDynamic = (r) => DYNAMIC_SOURCES.has(r.source);

/**
 * Техничка — строки без переводимого смысла: одни плейсхолдеры/формулы (`$t(site.name), $t(site.city)`,
 * `{{seats}} × {{price}} = {{total}}`), числа и даты, URL/e-mail/телефоны, коды и самоназвания языков
 * (RU, English, עברית), сокращения единиц (м, д, ч, мин, с), названия-бренды, одинаковые на всех
 * языках (Google Maps, OpenStreetMap, STARS). Строка со словами и плейсхолдером внутри — не техничка.
 */
const TECH_KEY_PREFIXES = ['common:lang.short.', 'common:lang.name.'];
const stripPh = (s) => (s ?? '').replace(/\{\{[^}]+\}\}|\$t\([^)]+\)|\$\{[^}]+\}|\{[\w.]+\}/g, '');
const UNIT = /^[\d\s.,]*(м|км|см|кг|г|д|ч|мин|с|сек|₽|руб\.?|%)$/u;
const URLISH = /^(https?:\/\/|mailto:|tel:|www\.)\S+$|^[\w.+-]+@[\w-]+\.[\w.-]+$|^\+?[\d\s()‑–-]{6,}$/u;
const DATE_FMT = /^[dDmMyYhHs]+([.\/:\s,-]+[dDmMyYhHs]+)+$/;
export const isTechnical = (r) => {
  const vals = [r.ru, r.en, r.he].map((v) => (v ?? '').trim());
  const [ru, en, he] = vals;
  if (TECH_KEY_PREFIXES.some((p) => r.key.startsWith(p))) return true;
  if (!vals.some((v) => /\p{L}/u.test(stripPh(v)))) return true; // плейсхолдеры, формулы, числа, даты, символы
  if (vals.filter(Boolean).every((v) => URLISH.test(v) || DATE_FMT.test(v))) return true;
  if (UNIT.test(ru) && (!en || UNIT.test(en) || /^[\d\s.,]*[a-z]{1,3}$/.test(en))) return true; // «м», «46 м», «мин»
  // одинаково на всех трёх языках и без кириллицы — бренд/код, не переводится (кириллица = непереведённая заглушка)
  return Boolean(ru) && ru === en && en === he && !/\p{Script=Cyrillic}/u.test(ru);
};

/* ───────────────────────────── JSON с позициями ───────────────────────────── */

/**
 * Разбор JSON с позициями: для строк — [start,end) токена, для объектов — позиция `}` и отступ
 * последнего ключа (чтобы вставить недостающий ключ без переформатирования файла).
 */
function parseJsonPositions(text) {
  let i = 0;
  const strings = new Map();
  const objects = new Map();
  const ws = () => {
    while (/\s/.test(text[i])) i++;
  };
  const str = () => {
    const s = i;
    i++;
    while (text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
    i++;
    return { start: s, end: i, value: JSON.parse(text.slice(s, i)) };
  };
  const value = (p) => {
    ws();
    const c = text[i];
    if (c === '{') {
      i++;
      let lastEnd = i;
      let indent = null;
      ws();
      if (text[i] === '}') {
        i++;
      } else {
        for (;;) {
          ws();
          const lineStart = text.lastIndexOf('\n', i) + 1;
          indent = text.slice(lineStart, i).match(/^\s*/)[0];
          const k = str().value;
          ws();
          i++; // :
          value(p ? `${p}.${k}` : k);
          lastEnd = i;
          ws();
          if (text[i] === ',') {
            i++;
            continue;
          }
          i++; // }
          break;
        }
      }
      objects.set(p, { lastEnd, indent });
      return;
    }
    if (c === '[') {
      i++;
      let n = 0;
      ws();
      if (text[i] === ']') return void i++;
      for (;;) {
        value(`${p}[${n++}]`);
        ws();
        if (text[i++] === ',') continue;
        break;
      }
      return;
    }
    if (c === '"') {
      strings.set(p, str());
      return;
    }
    while (i < text.length && !/[,}\]\s]/.test(text[i])) i++;
  };
  value('');
  return { strings, objects };
}

/* ───────────────────────────── TypeScript: литералы и пути ───────────────────────────── */

const parseTs = (file) =>
  ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const propName = (n) =>
  ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n) ? n.text : null;

/** Статическое значение выражения-строки (литерал, шаблон без подстановок, `+`, `[...].join(sep)`). */
function evalStr(n) {
  if (!n) return null;
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  if (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isSatisfiesExpression?.(n))
    return evalStr(n.expression);
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const a = evalStr(n.left);
    const b = evalStr(n.right);
    return a == null || b == null ? null : a + b;
  }
  if (
    ts.isCallExpression(n) &&
    ts.isPropertyAccessExpression(n.expression) &&
    n.expression.name.text === 'join' &&
    ts.isArrayLiteralExpression(n.expression.expression)
  ) {
    const parts = n.expression.expression.elements.map(evalStr);
    const sep = n.arguments.length ? evalStr(n.arguments[0]) : ',';
    return parts.includes(null) || sep == null ? null : parts.join(sep);
  }
  return null;
}
const isPlainLiteral = (n) => n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n));

/** Путь узла от объявления переменной: `PROGRAMS[0].title`, `demoPlan().events[1](koncert).text`. */
function nodePath(node) {
  const segs = [];
  let child = node;
  for (let p = node.parent; p && !ts.isSourceFile(p); child = p, p = p.parent) {
    if (ts.isPropertyAssignment(p) && p.initializer === child) {
      const k = propName(p.name);
      segs.unshift(/^[A-Za-z_$][\w$]*$/.test(k) ? `.${k}` : `['${k}']`);
    } else if (ts.isArrayLiteralExpression(p)) {
      segs.unshift(`[${p.elements.indexOf(child)}]`);
    } else if (ts.isCallExpression(p) && p.arguments.includes(child)) {
      const a0 = p.arguments[0];
      segs.unshift(a0 && ts.isStringLiteral(a0) ? `(${a0.text})` : `(#${p.arguments.indexOf(child)})`);
    } else if (ts.isVariableDeclaration(p)) {
      segs.unshift(p.name.getText());
    } else if (ts.isFunctionDeclaration(p)) {
      segs.unshift(`${p.name?.text ?? 'fn'}().`);
    }
  }
  return segs.join('').replace(/\(\)\.\./g, '().').replace(/^\./, '');
}

const objProp = (obj, name) =>
  obj.properties.find((p) => ts.isPropertyAssignment(p) && propName(p.name) === name);

/** Все объекты `{ru, en?, he?}` в файле со статически вычислимым ru. */
function tsTriplets(file) {
  const sf = parseTs(file);
  const out = [];
  const visit = (n) => {
    if (ts.isObjectLiteralExpression(n)) {
      const ru = objProp(n, 'ru');
      const ruV = ru && evalStr(ru.initializer);
      if (ruV != null && n.properties.every((p) => !p.name || LANGS.includes(propName(p.name)))) {
        const en = objProp(n, 'en');
        const he = objProp(n, 'he');
        out.push({
          path: nodePath(n),
          ru: ruV,
          en: en ? (evalStr(en.initializer) ?? '') : '',
          he: he ? (evalStr(he.initializer) ?? '') : '',
          loc: he
            ? isPlainLiteral(he.initializer)
              ? { kind: 'ts', file: rel(file), start: he.initializer.getStart(sf), end: he.initializer.end }
              : { kind: 'ts-fixed', file: rel(file) }
            : { kind: 'ts-insert', file: rel(file), at: n.properties.at(-1).end, objStart: n.getStart(sf), indent: indentOf(sf, n.properties.at(-1)) },
        });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

const indentOf = (sf, node) => {
  const text = sf.text;
  const s = node.getStart(sf);
  const ls = text.lastIndexOf('\n', s) + 1;
  return text.slice(ls, s).match(/^\s*/)[0];
};

/** Листья-строки объекта `export const content = {...}` файла разделов: путь → {value, start, end}. */
function contentLeaves(file) {
  const sf = parseTs(file);
  const leaves = new Map();
  const walk = (n, p) => {
    if (ts.isObjectLiteralExpression(n)) {
      for (const prop of n.properties)
        if (ts.isPropertyAssignment(prop)) walk(prop.initializer, `${p}${p ? '.' : ''}${propName(prop.name)}`);
    } else if (ts.isArrayLiteralExpression(n)) {
      n.elements.forEach((e, i) => walk(e, `${p}[${i}]`));
    } else {
      const v = evalStr(n);
      if (v != null)
        leaves.set(p, { value: v, start: isPlainLiteral(n) ? n.getStart(sf) : null, end: n.end });
    }
  };
  const visit = (n) => {
    if (ts.isVariableDeclaration(n) && n.name.getText() === 'content' && n.initializer) walk(n.initializer, '');
    else ts.forEachChild(n, visit);
  };
  visit(sf);
  return leaves;
}

/** Литерал `NAME.prop` в объекте-константе (GHOST_WORDS), массиве (MARQUEE[i].text) и т. п. */
function tsLiteralAt(file, varName, getNode) {
  const sf = parseTs(file);
  let found = null;
  const visit = (n) => {
    if (ts.isVariableDeclaration(n) && n.name.getText() === varName) {
      let init = n.initializer;
      while (init && (ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init))) init = init.expression;
      found = getNode(init, sf);
    } else ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

/* ───────────────────────────── источники ───────────────────────────── */

const PLURAL = /_(zero|one|two|few|many|other)$/;
const flatten = (o, p = '', out = new Map()) => {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out.set(key, String(v));
  }
  return out;
};

function i18nRows() {
  const dir = path.join(FRONT, 'src', 'i18n', 'locales');
  const nss = fs.readdirSync(path.join(dir, 'ru')).filter((f) => f.endsWith('.json') && f !== 'admin.json');
  const rows = [];
  for (const f of nss) {
    const ns = f.replace(/\.json$/, '');
    const flat = Object.fromEntries(LANGS.map((l) => [l, flatten(JSON.parse(read(path.join(dir, l, f))))]));
    const keys = [...new Set(LANGS.flatMap((l) => [...flat[l].keys()]))];
    const heFile = path.join(dir, 'he', f);
    for (const k of keys) {
      const m = PLURAL.exec(k);
      const base = m && k.slice(0, -m[0].length);
      const plural = m && LANGS.some((l) => flat[l].has(`${base}_other`));
      // формы множественного числа, которых нет в иврите (few/many у ru), не показываем
      if (plural && !flat.he.has(k)) continue;
      const top = k.split('.')[0];
      const section = NS_LABEL[`${ns}.${top}`] ?? NS_LABEL[`${ns}.*`] ?? ns;
      const pick = (l) => flat[l].get(k) ?? (plural ? (flat[l].get(`${base}_other`) ?? '') : '');
      rows.push({
        key: `${ns}:${k}`,
        source: 'i18n',
        section: plural ? `${section} (форма мн. числа «${m[1]}»)` : section,
        ru: pick('ru'),
        en: pick('en'),
        he: flat.he.get(k) ?? '',
        loc: { kind: 'json', file: rel(heFile), path: k },
      });
    }
  }
  return rows;
}

function contentRows() {
  const dir = path.join(FRONT, 'src', 'content');
  const L = Object.fromEntries(LANGS.map((l) => [l, contentLeaves(path.join(dir, l, 'sections.ts'))]));
  const heFile = rel(path.join(dir, 'he', 'sections.ts'));
  const rows = [];
  for (const [p, ru] of L.ru) {
    const last = p.split('.').at(-1).replace(/\[\d+\]$/, '');
    if (['href', 'id', 'photos'].includes(last) || isUrl(ru.value)) continue;
    const en = L.en.get(p)?.value ?? '';
    const heLeaf = L.he.get(p);
    const he = heLeaf?.value ?? '';
    if (!hasLetters(ru.value) && !hasLetters(en) && !hasLetters(he)) continue;
    rows.push({
      key: `content/sections:${p}`,
      source: 'content',
      section: contentSection(p, L.ru),
      ru: ru.value,
      en,
      he,
      loc: heLeaf?.start != null ? { kind: 'ts', file: heFile, start: heLeaf.start, end: heLeaf.end } : { kind: 'ts-fixed', file: heFile },
    });
  }
  return rows;
}

function contentSection(p, ru) {
  const parts = p.split('.');
  const two = `${parts[0]}.${parts[1]}`;
  const ch = /^history\.chapters\[(\d+)\]/.exec(p);
  if (ch) return `История — глава ${ru.get(`history.chapters[${ch[1]}].year`)?.value ?? +ch[1] + 1}`;
  if (CONTENT_LABEL[two]) {
    const sub = parts[2]?.replace(/\[\d+\]$/, '');
    return sub === 'hero' ? `${CONTENT_LABEL[two]} — первый экран` : CONTENT_LABEL[two];
  }
  const part = PART_LABEL[parts[1]?.replace(/\[\d+\]$/, '')];
  return `${CONTENT_LABEL[parts[0]] ?? parts[0]}${part ? ` — ${part}` : ''}`;
}

const tripletRows = (file, alias, sectionOf) =>
  tsTriplets(file).map((t) => ({
    key: `${alias}:${t.path}`,
    source: alias,
    section: sectionOf(t.path, t),
    ru: t.ru,
    en: t.en,
    he: t.he,
    loc: t.loc,
  }));

function siteRows() {
  const f = path.join(FRONT, 'src', 'config', 'site.ts');
  return tripletRows(f, 'site', (p) =>
    p.includes('people') ? 'Об общине — имена' : p.includes('address') ? 'Контакты — адрес' : p.includes('transport') ? 'Туристам — как добраться' : 'Контакты и факты'
  );
}

function searchRows() {
  const f = path.join(FRONT, 'src', 'screens', 'search', 'static-pages.ts');
  return tripletRows(f, 'search', (p) =>
    p.endsWith('keywords') ? 'Поиск — ключевые слова страниц (не видны, по ним ищут)' : 'Поиск — названия страниц'
  );
}

/** Смысл призрачных слов «Созвездия» (сами слова — только на иврите). */
const GHOST_MEANING = {
  shalom: ['Шалом (мир, здравствуйте)', 'Shalom (peace, hello)'],
  bruchim: ['Добро пожаловать', 'Welcome'],
  shabbat: ['Шаббат шалом (мирной субботы)', 'Shabbat shalom'],
  beitKnesset: ['Синагога', 'Synagogue'],
  kehila: ['Община', 'Community'],
  torah: ['Тора', 'Torah'],
  chesed: ['Милосердие (хесед)', 'Kindness (chesed)'],
  tzedaka: ['Благотворительность (цдака)', 'Charity (tzedakah)'],
  emuna: ['Вера', 'Faith'],
  yerushalayim: ['Иерусалим', 'Jerusalem'],
  tfila: ['Молитва', 'Prayer'],
  chadashot: ['Новости', 'News'],
  zachor: ['Помни', 'Remember'],
  kasher: ['Кошерно', 'Kosher'],
  tmunot: ['Фотографии', 'Photos'],
  chag: ['Хаг самеах (весёлого праздника)', 'Chag sameach (happy holiday)'],
  limud: ['Учёба', 'Study'],
  toda: ['Спасибо', 'Thank you'],
};

function ghostRows() {
  const f = path.join(FRONT, 'src', 'ui', 'judaica', 'ghost-model.ts');
  const rows = [];
  tsLiteralAt(f, 'GHOST_WORDS', (obj, sf) => {
    for (const p of obj.properties) {
      const k = propName(p.name);
      const [ru, en] = GHOST_MEANING[k] ?? ['', ''];
      rows.push({
        key: `ghost:GHOST_WORDS.${k}`,
        source: 'ghost',
        section: 'Созвездие — призрачные слова на фоне разделов (RU/EN — смысл)',
        ru,
        en,
        he: p.initializer.text,
        loc: { kind: 'ts', file: rel(f), start: p.initializer.getStart(sf), end: p.initializer.end },
        noFlag: true,
      });
    }
  });
  const hv = path.join(FRONT, 'src', 'screens', 'home', 'view.tsx');
  tsLiteralAt(hv, 'MARQUEE', (arr, sf) => {
    const text = (i) => objProp(arr.elements[i], 'text').initializer;
    const he = text(5);
    rows.push({
      key: 'marquee:MARQUEE[5].text',
      source: 'ghost',
      section: 'Главная — бегущая строка (остальные ивритские слова строки — из «Созвездия»)',
      ru: evalStr(text(3)),
      en: evalStr(text(4)),
      he: he.text,
      loc: { kind: 'ts', file: rel(hv), start: he.getStart(sf), end: he.end },
    });
  });
  return rows;
}

/** Модуль .ts → CommonJS в памяти (только для файлов без алиасов в рантайм-импортах). */
function loadTs(file) {
  const out = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const m = new Module(file);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m._compile(out.outputText, file);
  return m.exports;
}

const HN_FILE = path.join(BACK, 'src', 'modules', 'calendar', 'hebrew-names.ts');

function holidayRows() {
  const rows = tripletRows(HN_FILE, 'holidays', () => '');
  for (const r of rows) {
    const title = rows.find((x) => x.key === r.key.replace(/\.text$/, '.title'));
    r.section = `Праздник — страница «${title?.ru ?? ''}»`;
  }
  return rows;
}

/** Названия праздников и недельных глав, которые показывает календарь (из @hebcal/core). */
function hebcalRows() {
  const { HebrewCalendar, ParshaEvent, flags } = reqBack('@hebcal/core');
  const hn = loadTs(HN_FILE);
  const fixesSrc = hnFixes();
  const seen = new Map();
  const y0 = new Date().getFullYear();
  const evs = HebrewCalendar.calendar({
    start: new Date(y0 - 1, 0, 1),
    end: new Date(y0 + 7, 11, 31),
    sedrot: true,
    il: false,
    noModern: true,
  });
  for (const ev of evs) {
    const desc = ev.getDesc();
    if (seen.has(desc) || ev.eventTime) continue;
    const isParsha = ev instanceof ParshaEvent;
    if (!isParsha && (ev.getFlags() & (flags.DAF_YOMI | flags.OMER_COUNT | flags.HEBREW_DATE | flags.MOLAD | flags.SHABBAT_MEVARCHIM)))
      continue;
    const hcHe = isParsha ? ev.render('he-x-NoNikud').replace(/^פרשת\s+/, '') : ev.render('he-x-NoNikud');
    seen.set(desc, {
      key: `hebcal:${desc}`,
      source: 'hebcal',
      section: isParsha ? 'Календарь — недельные главы' : 'Календарь — праздники и особые дни',
      ru: isParsha ? ev.parsha.map((p) => hn.PARSHIOT_RU[p] ?? p).join('–') : hn.holidayNameRu(desc),
      en: isParsha ? ev.parsha.join('-') : ev.render('en'),
      he: fixesSrc.values.get(desc) ?? hcHe,
      loc: { kind: 'hebcal', file: rel(HN_FILE), desc },
      order: isParsha ? 1 : 0,
    });
  }
  return [...seen.values()].sort((a, b) => a.order - b.order);
}

/** Текущие записи HE_NAME_FIXES: значения и позиции литералов. */
function hnFixes() {
  const values = new Map();
  const pos = new Map();
  let obj = null;
  tsLiteralAt(HN_FILE, 'HE_NAME_FIXES', (o, sf) => {
    obj = { end: o.getEnd(), start: o.getStart(sf), empty: o.properties.length === 0, last: o.properties.at(-1)?.end };
    for (const p of o.properties) {
      values.set(propName(p.name), p.initializer.text);
      pos.set(propName(p.name), { start: p.initializer.getStart(sf), end: p.initializer.end });
    }
  });
  return { values, pos, obj };
}

/** Сиды: путь в content.data.ts → таблица и поле БД (для миграции правок в уже залитые данные). */
function seedDbTarget(p) {
  const field = p.split('.').at(-1);
  if (/^PROGRAMS\[/.test(p)) return { table: 'programs', field };
  if (/^DEPARTMENTS\[/.test(p)) return { table: 'departments', field };
  if (p === 'ADDRESS') return { table: 'departments', field: 'address' };
  if (/^NEWS\[/.test(p)) return { table: 'news', field };
  if (/^ALBUMS\[\d+\]\.photos/.test(p)) return { table: 'photos', field: 'caption' };
  if (/^ALBUMS\[/.test(p)) return { table: 'albums', field: 'title' };
  if (/^SETTINGS\./.test(p)) return { table: 'site_settings', key: field };
  return null;
}

const SEED_LABEL = [
  [/^PROGRAMS/, 'Данные — программы'],
  [/^DEPARTMENTS|^ADDRESS/, 'Данные — подразделения'],
  [/^NEWS/, 'Данные — новости из сидов'],
  [/^ALBUMS\[\d+\]\.photos/, 'Данные — подписи фото'],
  [/^ALBUMS/, 'Данные — альбомы'],
  [/^SETTINGS/, 'Данные — настройки'],
];

function seedRows() {
  const f = path.join(BACK, 'src', 'shared', 'database', 'seeds', 'content.data.ts');
  const rows = tripletRows(f, 'seed', (p) => SEED_LABEL.find(([re]) => re.test(p))?.[1] ?? 'Данные');
  for (const r of rows) {
    const p = r.key.slice('seed:'.length);
    const db = seedDbTarget(p);
    // запись в БД ищем по русскому заголовку (сид мог дописать в другие поля, напр. атрибуцию фото)
    const title = db && db.table !== 'photos' && rows.find((x) => x.key === `seed:${p.replace(/\.\w+$/, '.title')}`);
    if (db) db.match = title && title !== r ? { col: 'title', ru: title.ru } : { col: db.field ?? 'value', ru: r.ru };
    r.loc.db = db;
  }
  const d = path.join(BACK, 'src', 'shared', 'database', 'seeds', 'demo-mock.data.ts');
  const demo = tripletRows(d, 'demo', (p) =>
    /fundraisers|FUND_NOTE/.test(p) ? 'Демо — сборы (плашка «Пример»)' : /HOLIDAYS/.test(p) ? 'Демо — праздничные события (плашка «Пример»)' : 'Демо — события (плашка «Пример»)'
  );
  return [...rows, ...demo];
}

/* ───────────────────────────── БД ───────────────────────────── */

const DB_FIELDS = {
  news: ['title', 'lead', 'body'],
  events: ['title', 'description', 'place'],
  fundraisers: ['title', 'body'],
  programs: ['title', 'audience', 'schedule'],
  departments: ['title', 'description', 'address', 'hours'],
  albums: ['title'],
  photos: ['caption'],
  schedule_overrides: ['note'],
};
const DB_LABEL = {
  news: 'Данные (БД) — новости', events: 'Данные (БД) — события', fundraisers: 'Данные (БД) — сборы',
  programs: 'Данные (БД) — программы', departments: 'Данные (БД) — подразделения', albums: 'Данные (БД) — альбомы',
  photos: 'Данные (БД) — подписи фото', schedule_overrides: 'Данные (БД) — примечания расписания',
  site_settings: 'Данные (БД) — настройки',
};

export function dbConfig() {
  const env = Object.fromEntries(
    read(path.join(BACK, '.env')).split(/\r?\n/).map((l) => /^([A-Z_]+)=(.*)$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2].trim()])
  );
  return { host: env.DB_HOST, port: +env.DB_PORT, user: env.DB_USERNAME, password: env.DB_PASSWORD, database: env.DB_DATABASE };
}

/**
 * Локализуемые поля БД, которых нет в сидах/моках: новости Telegram (только ru) и демо (`demo-*`) не берём.
 * БД недоступна → пусто и предупреждение.
 */
async function dbRows(covered, warn) {
  let pg;
  try {
    pg = createRequire(path.join(ROOT, 'package.json'))('pg');
  } catch {
    return [];
  }
  const c = new pg.Client({ ...dbConfig(), connectionTimeoutMillis: 3000 });
  try {
    await c.connect();
  } catch (e) {
    warn(`БД недоступна (${e.message}) — данные только из БД не собраны`);
    return [];
  }
  const rows = [];
  try {
    for (const [table, fields] of Object.entries(DB_FIELDS)) {
      const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]);
      const have = new Set(cols.rows.map((r) => r.column_name));
      const idCol = have.has('slug') ? 'slug' : have.has('id') ? 'id' : 'date';
      const where = table === 'news' ? 'WHERE source_url IS NULL' : have.has('slug') ? `WHERE slug NOT LIKE 'demo-%'` : '';
      const res = await c.query(`SELECT ${idCol}::text AS ident, ${fields.filter((f) => have.has(f)).join(', ')} FROM ${table} ${where} ORDER BY 1`);
      for (const r of res.rows) {
        // запись из сидов (совпал заголовок) целиком покрыта строками сидов
        if (r.title?.ru && covered.has(`${table}.title\u0000${r.title.ru}`)) continue;
        for (const f of fields) {
          const v = r[f];
          if (!v || typeof v !== 'object' || !v.ru) continue;
          if (covered.has(`${table}.${f}\u0000${v.ru}`)) continue;
          rows.push({
            key: `db:${table}/${r.ident}.${f}`,
            source: 'db',
            section: DB_LABEL[table],
            ru: v.ru, en: v.en ?? '', he: v.he ?? '',
            loc: { kind: 'db', table, idCol, ident: r.ident, field: f, old: v.he ?? null },
          });
        }
      }
    }
    const s = await c.query(`SELECT key, value FROM site_settings ORDER BY key`);
    for (const r of s.rows) {
      const v = r.value;
      if (!v || typeof v !== 'object' || Array.isArray(v) || typeof v.ru !== 'string') continue;
      if (covered.has(`site_settings.${r.key}\u0000${v.ru}`)) continue;
      rows.push({
        key: `db:site_settings/${r.key}`,
        source: 'db',
        section: DB_LABEL.site_settings,
        ru: v.ru, en: v.en ?? '', he: v.he ?? '',
        loc: { kind: 'db', table: 'site_settings', idCol: 'key', ident: r.key, field: 'value', old: v.he ?? null },
      });
    }
  } finally {
    await c.end();
  }
  return rows;
}

/* ───────────────────────────── сбор ───────────────────────────── */

export async function collectRows({ db = true, warn = (m) => console.warn(m) } = {}) {
  const bySource = {
    'i18n (frontend/src/i18n/locales, без admin)': i18nRows(),
    'тексты разделов (frontend/src/content)': contentRows(),
    'site.ts (адрес, имена, остановка)': siteRows(),
    'поиск: статические страницы': searchRows(),
    '«Созвездие» и бегущая строка': ghostRows(),
    'описания праздников (hebrew-names.ts)': holidayRows(),
    'названия праздников и глав (hebcal)': hebcalRows(),
    'сиды и демо-моки (backend seeds)': seedRows(),
  };
  const covered = new Set();
  for (const r of bySource['сиды и демо-моки (backend seeds)']) {
    const t = r.loc.db;
    if (t) covered.add(`${t.table}.${t.field ?? t.key}\u0000${r.ru}`);
  }
  bySource['данные только в БД'] = db ? await dbRows(covered, warn) : [];
  const rows = [];
  for (const [source, list] of Object.entries(bySource))
    for (const r of list) rows.push({ ...r, sourceLabel: source });
  for (const r of rows) {
    r.stub = /\[ВПИШИ/.test(r.ru) || /\[ВПИШИ/.test(r.he);
    if (r.stub && !r.section.includes('заглушка')) r.section += ' · заглушка [ВПИШИ], факт ещё не вписан';
    r.decorative = isDecorative(r);
    r.dynamic = isDynamic(r);
    r.technical = isTechnical(r);
    r.untranslated = !r.noFlag && (!r.he.trim() || r.he.trim() === r.ru.trim());
  }
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.key)) throw new Error(`Дубль ключа: ${r.key}`);
    seen.add(r.key);
  }
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => sectionGroup(a.r.section) - sectionGroup(b.r.section) || a.i - b.i)
    .map(({ r }) => r);
}

/* ───────────────────────────── обратная запись ───────────────────────────── */

/** Плейсхолдеры, которые должны пережить правку: {{n}}, {n}, $t(...), ${...}. */
export const placeholders = (s) => (s.match(/\{\{[^}]+\}\}|\$t\([^)]+\)|\$\{[^}]+\}|\{[\w.]+\}/g) ?? []).sort();

const tsQuote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}'`;

/**
 * План правок: для каждой {key, he} — что и где меняется. Ошибки (нет ключа, потерян плейсхолдер,
 * место не редактируется автоматически) — в `problems`.
 */
export function planEdits(rows, fixes) {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const edits = [];
  const problems = [];
  for (const { key, he, line } of fixes) {
    const r = byKey.get(key);
    if (!r) {
      problems.push(`строка ${line}: ключ не найден — ${key}`);
      continue;
    }
    if (he === r.he) continue;
    const need = placeholders(r.he || r.ru);
    const got = placeholders(he);
    if (need.join('|') !== got.join('|')) {
      problems.push(`строка ${line} (${key}): плейсхолдеры ${need.join(' ') || '—'} → ${got.join(' ') || '—'}, правка пропущена`);
      continue;
    }
    if (r.loc.kind === 'ts-fixed') {
      problems.push(`строка ${line} (${key}): текст собирается выражением в ${r.loc.file}, правьте вручную`);
      continue;
    }
    edits.push({ key, line, row: r, from: r.he, to: he });
  }
  return { edits, problems };
}

/** Применить правки: файлы меняются точечно (с конца файла к началу), для БД — миграция. */
export function applyEdits(edits, { dryRun = false, now = Date.now() } = {}) {
  const byFile = new Map();
  const sql = [];
  const add = (file, e) => byFile.set(file, [...(byFile.get(file) ?? []), e]);
  const hn = edits.some((e) => e.row.loc.kind === 'hebcal') ? hnFixes() : null;
  const hnNew = [];
  for (const e of edits) {
    const { loc } = e.row;
    if (loc.kind === 'ts') add(loc.file, { start: loc.start, end: loc.end, text: tsQuote(e.to) });
    else if (loc.kind === 'ts-insert') {
      const sf = read(path.join(ROOT, loc.file));
      const multiline = sf.slice(loc.objStart, loc.at).includes('\n');
      add(loc.file, { start: loc.at, end: loc.at, text: multiline ? `,\n${loc.indent}he: ${tsQuote(e.to)}` : `, he: ${tsQuote(e.to)}` });
    } else if (loc.kind === 'json') add(loc.file, { json: loc.path, text: e.to });
    else if (loc.kind === 'hebcal') {
      const p = hn.pos.get(loc.desc);
      if (p) add(loc.file, { start: p.start, end: p.end, text: tsQuote(e.to) });
      else hnNew.push(`  ${tsQuote(loc.desc)}: ${tsQuote(e.to)},`);
    }
    if (loc.kind === 'db') sql.push(dbUpdate(loc, e.to, loc.old, { byId: true }));
    if (loc.db) sql.push(dbUpdate(loc.db, e.to, e.from || null, {}));
  }
  if (hnNew.length) {
    const o = hn.obj;
    const file = rel(HN_FILE);
    const at = o.empty ? o.start + 1 : o.last;
    const text = o.empty ? `\n${hnNew.join('\n')}\n` : `,\n${hnNew.join('\n').replace(/,$/, '')}`;
    add(file, { start: at, end: o.empty ? o.end - 1 : at, text });
  }
  const changed = [];
  for (const [file, list] of byFile) {
    const abs = path.join(ROOT, file);
    let text = read(abs);
    const json = list.filter((x) => x.json);
    if (json.length) text = applyJson(text, json);
    for (const x of list.filter((y) => !y.json).sort((a, b) => b.start - a.start))
      text = text.slice(0, x.start) + x.text + text.slice(x.end);
    if (!dryRun) fs.writeFileSync(abs, text, 'utf8');
    changed.push(file);
  }
  let migration = null;
  if (sql.length) {
    const name = `HebrewFixes${now}`;
    migration = rel(path.join(BACK, 'src', 'shared', 'database', 'migrations', `${now}-HebrewFixes.ts`));
    const body = [
      `import { MigrationInterface, QueryRunner } from 'typeorm';`,
      ``,
      `/** Правки иврита носителем (npm run i18n:he-import): поле he в уже залитых данных. */`,
      `export class ${name} implements MigrationInterface {`,
      `  name = '${name}';`,
      ``,
      `  public async up(q: QueryRunner): Promise<void> {`,
      ...sql.map((s) => `    await q.query(${JSON.stringify(s.up.text)}, ${JSON.stringify(s.up.params)});`),
      `  }`,
      ``,
      `  public async down(q: QueryRunner): Promise<void> {`,
      ...sql.map((s) => `    await q.query(${JSON.stringify(s.down.text)}, ${JSON.stringify(s.down.params)});`),
      `  }`,
      `}`,
      ``,
    ].join('\n');
    if (!dryRun) fs.writeFileSync(path.join(ROOT, migration), body, 'utf8');
  }
  return { changed, migration, sqlCount: sql.length };
}

function dbUpdate(t, to, from, { byId }) {
  const col = t.table === 'site_settings' ? 'value' : t.field;
  const where = byId
    ? `${t.idCol}::text = $2`
    : t.table === 'site_settings'
      ? `key = '${t.key}' AND value->>'ru' = $2`
      : `${t.match.col}->>'ru' = $2`;
  const ident = byId ? t.ident : t.match.ru;
  const set = (v) => (v == null ? `${col} = ${col} - 'he'` : `${col} = jsonb_set(${col}, '{he}', to_jsonb($1::text))`);
  return {
    up: { text: `UPDATE ${t.table} SET ${set(to)} WHERE ${where}`, params: [to, ident] },
    down: from == null
      ? { text: `UPDATE ${t.table} SET ${set(null)} WHERE ${where.replace('$2', '$1')}`, params: [ident] }
      : { text: `UPDATE ${t.table} SET ${set(from)} WHERE ${where}`, params: [from, ident] },
  };
}

function applyJson(text, list) {
  const { strings, objects } = parseJsonPositions(text);
  const reps = [];
  for (const x of list) {
    const s = strings.get(x.json);
    if (s) {
      reps.push({ start: s.start, end: s.end, text: JSON.stringify(x.text) });
      continue;
    }
    // ключа нет в he-файле: вставить в ближайший существующий родительский объект
    const parts = x.json.split('.');
    let i = parts.length - 1;
    while (i > 0 && !objects.has(parts.slice(0, i).join('.'))) i--;
    const parent = objects.get(parts.slice(0, i).join('.'));
    const rest = parts.slice(i);
    let val = JSON.stringify(x.text);
    for (let j = rest.length - 1; j > 0; j--) val = `{ ${JSON.stringify(rest[j])}: ${val} }`;
    reps.push({ start: parent.lastEnd, end: parent.lastEnd, text: `,\n${parent.indent ?? '  '}${JSON.stringify(rest[0])}: ${val}` });
  }
  for (const r of reps.sort((a, b) => b.start - a.start)) text = text.slice(0, r.start) + r.text + text.slice(r.end);
  JSON.parse(text);
  return text;
}
