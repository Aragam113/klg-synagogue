/**
 * Формы сущностей админки: описание полей → форма (строки для инпутов) → тело для API.
 * Локализуемые поля — {ru,en,he}, RU обязателен; пустые en/he не отправляются.
 * Время — по Калининграду (`@/utils/kld-time`).
 */
import { formatLocal, isoToLocal, localToIso } from '@/utils/kld-time';

export type Loc = { ru: string; en: string; he: string };
export type Tier = { until: string; price: string };
export type FormValue = string | boolean | Loc | Tier[];
export type FormState = Record<string, FormValue>;
export type FormErrors = Record<string, string>;

export type FieldKind =
  | 'loc'
  | 'text'
  | 'int'
  | 'bool'
  | 'select'
  | 'datetime'
  | 'date'
  | 'cover'
  | 'lines'
  | 'tiers'
  | 'slug';

export interface FieldSpec {
  key: string;
  kind: FieldKind;
  /** Ключ подписи в неймспейсе admin (`fields.<label>`), по умолчанию — key. */
  label?: string;
  required?: boolean;
  multiline?: boolean;
  /** int: минимальное значение (по умолчанию 0). Пусто → null. */
  min?: number;
  options?: string[];
  /** Значение по умолчанию для новой записи. */
  initial?: FormValue;
}

export type EntityKey = 'news' | 'events' | 'fundraisers' | 'programs' | 'departments' | 'albums';

export interface EntitySpec {
  key: EntityKey;
  /** Путь API: /admin/<path>. */
  path: string;
  /** Публичный адрес записи (для ссылки «Открыть на сайте»). */
  publicUrl?: (row: Record<string, unknown>) => string | null;
  fields: FieldSpec[];
  /** Колонки списка: заголовок всегда первым. */
  listMeta: (row: Record<string, unknown>) => string[];
}

const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

export const toLoc = (v: unknown): Loc => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { ru: str(o.ru), en: str(o.en), he: str(o.he) };
};

/** {ru,en,he} → тело: пустые языки отбрасываются; без ru → null. */
export const fromLoc = (v: Loc): { ru: string; en?: string; he?: string } | null => {
  const ru = v.ru.trim();
  if (!ru) return null;
  const out: { ru: string; en?: string; he?: string } = { ru };
  if (v.en.trim()) out.en = v.en.trim();
  if (v.he.trim()) out.he = v.he.trim();
  return out;
};

const isLoc = (v: FormValue): v is Loc => typeof v === 'object' && !Array.isArray(v);
const isTiers = (v: FormValue): v is Tier[] => Array.isArray(v);

const INT = /^\d+$/;

const emptyValue = (f: FieldSpec): FormValue => {
  if (f.initial !== undefined) return f.initial;
  switch (f.kind) {
    case 'loc':
      return { ru: '', en: '', he: '' };
    case 'bool':
      return false;
    case 'tiers':
      return [];
    case 'select':
      return f.options?.[0] ?? '';
    default:
      return '';
  }
};

export const emptyForm = (spec: EntitySpec): FormState =>
  Object.fromEntries(spec.fields.map((f) => [f.key, emptyValue(f)]));

/** Запись API → форма. */
export const toForm = (spec: EntitySpec, row: Record<string, unknown>): FormState =>
  Object.fromEntries(
    spec.fields.map((f): [string, FormValue] => {
      const v = row[f.key];
      if (v === undefined) return [f.key, emptyValue(f)];
      switch (f.kind) {
        case 'loc':
          return [f.key, toLoc(v)];
        case 'bool':
          return [f.key, v === true];
        case 'datetime':
          return [f.key, isoToLocal(v)];
        case 'date':
          return [f.key, typeof v === 'string' ? v.slice(0, 10) : ''];
        case 'lines':
          return [f.key, Array.isArray(v) ? v.map(str).join('\n') : ''];
        case 'tiers':
          return [
            f.key,
            Array.isArray(v)
              ? v.map((t: { until?: unknown; priceRub?: unknown }) => ({
                  until: str(t.until),
                  price: str(t.priceRub),
                }))
              : [],
          ];
        default:
          return [f.key, str(v)];
      }
    })
  );

const filledTiers = (v: Tier[]) => v.filter((t) => t.until.trim() || t.price.trim());

/** Проверка до отправки; ключи ошибок — как у API (`required`, `out_of_range`). */
export const validate = (spec: EntitySpec, form: FormState): FormErrors => {
  const errs: FormErrors = {};
  for (const f of spec.fields) {
    const v = form[f.key];
    if (f.kind === 'loc' && isLoc(v)) {
      if (f.required && !v.ru.trim()) errs[`${f.key}.ru`] = 'required';
    } else if (f.kind === 'int' && typeof v === 'string') {
      const s = v.trim().replace(/\s/g, '');
      if (!s) {
        if (f.required) errs[f.key] = 'required';
      } else if (!INT.test(s) || Number(s) < (f.min ?? 0)) errs[f.key] = 'out_of_range';
    } else if (f.kind === 'tiers' && isTiers(v)) {
      const bad = filledTiers(v).some((t) => {
        const p = t.price.trim().replace(/\s/g, '');
        return !INT.test(p) || Number(p) < 1;
      });
      if (bad) errs[f.key] = 'out_of_range';
    } else if (typeof v === 'string' && f.required && !v.trim()) errs[f.key] = 'required';
  }
  return errs;
};

/** Форма → тело POST/PATCH. */
export const toBody = (spec: EntitySpec, form: FormState): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const f of spec.fields) {
    const v = form[f.key];
    switch (f.kind) {
      case 'loc':
        out[f.key] = isLoc(v) ? fromLoc(v) : null;
        break;
      case 'bool':
        out[f.key] = v === true;
        break;
      case 'int': {
        const s = str(v).trim().replace(/\s/g, '');
        out[f.key] = s ? Number(s) : null;
        break;
      }
      case 'datetime':
        out[f.key] = localToIso(str(v).trim());
        break;
      case 'date':
        out[f.key] = str(v).trim() || null;
        break;
      case 'lines':
        out[f.key] = str(v)
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case 'tiers':
        out[f.key] = isTiers(v)
          ? filledTiers(v).map((t) => ({
              until: t.until.trim() || null,
              priceRub: Number(t.price.trim().replace(/\s/g, '')),
            }))
          : [];
        break;
      case 'slug': {
        const s = str(v).trim();
        if (s) out[f.key] = s;
        break;
      }
      case 'cover':
      case 'text':
        out[f.key] = str(v).trim() || null;
        break;
      default:
        out[f.key] = str(v);
    }
  }
  return out;
};

/** Ошибка поля формы из ошибок клиента/сервера ('title.ru', 'priceTiers.0.priceRub' → 'title', 'priceTiers'). */
export const errorFor = (errs: FormErrors | undefined, key: string): string | undefined => {
  if (!errs) return undefined;
  if (errs[key]) return errs[key];
  const hit = Object.keys(errs).find((k) => k.split('.')[0] === key);
  return hit ? errs[hit] : undefined;
};

export const isDirty = (a: FormState, b: FormState): boolean =>
  JSON.stringify(a) !== JSON.stringify(b);

const loc = (row: Record<string, unknown>, key: string) => toLoc(row[key]).ru;

export const titleOf = (row: Record<string, unknown>): string => loc(row, 'title') || '—';

export const ENTITIES: Record<EntityKey, EntitySpec> = {
  news: {
    key: 'news',
    path: 'news',
    publicUrl: (r) => (r.status === 'published' ? `/news/${str(r.slug)}` : null),
    fields: [
      { key: 'title', kind: 'loc', required: true },
      { key: 'lead', kind: 'loc', multiline: true },
      { key: 'body', kind: 'loc', required: true, multiline: true },
      { key: 'kind', kind: 'select', options: ['news', 'announcement'] },
      { key: 'status', kind: 'select', options: ['draft', 'published'] },
      { key: 'cover', kind: 'cover' },
      { key: 'slug', kind: 'slug' },
    ],
    listMeta: (r) => [
      formatLocal(r.publishedAt ?? r.createdAt),
      `kind.${str(r.kind)}`,
      `status.${str(r.status)}`,
    ],
  },
  events: {
    key: 'events',
    path: 'events',
    publicUrl: (r) => (r.status === 'published' ? `/events/${str(r.slug)}` : null),
    fields: [
      { key: 'title', kind: 'loc', required: true },
      { key: 'description', kind: 'loc', required: true, multiline: true },
      { key: 'startsAt', kind: 'datetime', required: true },
      { key: 'endsAt', kind: 'datetime' },
      { key: 'place', kind: 'loc' },
      { key: 'isPaid', kind: 'bool' },
      { key: 'priceTiers', kind: 'tiers' },
      { key: 'capacity', kind: 'int', min: 1 },
      { key: 'status', kind: 'select', options: ['draft', 'published'] },
      { key: 'cover', kind: 'cover' },
      { key: 'slug', kind: 'slug' },
    ],
    listMeta: (r) => [
      formatLocal(r.startsAt),
      r.isPaid ? 'paid' : 'free',
      `status.${str(r.status)}`,
    ],
  },
  fundraisers: {
    key: 'fundraisers',
    path: 'fundraisers',
    publicUrl: (r) => `/fundraisers/${str(r.slug)}`,
    fields: [
      { key: 'title', kind: 'loc', required: true },
      { key: 'body', kind: 'loc', required: true, multiline: true },
      { key: 'goalRub', kind: 'int', min: 1 },
      { key: 'raisedRub', kind: 'int', initial: '0' },
      { key: 'supporters', kind: 'int', initial: '0' },
      { key: 'status', kind: 'select', options: ['active', 'closed'] },
      { key: 'endsAt', kind: 'datetime' },
      { key: 'cover', kind: 'cover' },
      { key: 'slug', kind: 'slug' },
    ],
    listMeta: (r) => [
      `${str(r.raisedRub)} / ${str(r.goalRub) || '∞'} ₽`,
      `status.${str(r.status)}`,
    ],
  },
  programs: {
    key: 'programs',
    path: 'programs',
    publicUrl: () => '/programs',
    fields: [
      { key: 'title', kind: 'loc', required: true },
      { key: 'audience', kind: 'loc' },
      { key: 'schedule', kind: 'loc', multiline: true },
      { key: 'contact', kind: 'text' },
      { key: 'cover', kind: 'cover' },
      { key: 'sort', kind: 'int', initial: '0' },
      { key: 'published', kind: 'bool', initial: true },
    ],
    listMeta: (r) => [r.published ? 'published' : 'hidden'],
  },
  departments: {
    key: 'departments',
    path: 'departments',
    publicUrl: () => '/departments',
    fields: [
      { key: 'title', kind: 'loc', required: true },
      { key: 'description', kind: 'loc', multiline: true },
      { key: 'address', kind: 'loc' },
      { key: 'phones', kind: 'lines' },
      { key: 'email', kind: 'text' },
      { key: 'hours', kind: 'loc' },
      { key: 'cover', kind: 'cover' },
      { key: 'sort', kind: 'int', initial: '0' },
      { key: 'published', kind: 'bool', initial: true },
    ],
    listMeta: (r) => [r.published ? 'published' : 'hidden'],
  },
  albums: {
    key: 'albums',
    path: 'albums',
    publicUrl: (r) => `/gallery/${str(r.slug)}`,
    fields: [
      { key: 'title', kind: 'loc', required: true },
      { key: 'cover', kind: 'cover' },
      { key: 'sort', kind: 'int', initial: '0' },
      { key: 'slug', kind: 'slug' },
    ],
    listMeta: () => [],
  },
};
