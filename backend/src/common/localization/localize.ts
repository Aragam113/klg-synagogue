export const LANGS = ['ru', 'en', 'he'] as const;
export type LangCode = (typeof LANGS)[number];
export const DEFAULT_LANG: LangCode = 'ru';

/** Локализуемое поле в БД (jsonb): русский обязателен, остальные — по мере перевода. */
export interface LocalizedString {
  ru: string;
  en?: string;
  he?: string;
}

export interface Localized {
  value: string;
  /** true — перевода на запрошенный язык нет, отдан русский. */
  fallback: boolean;
}

export function isLang(value: unknown): value is LangCode {
  return (
    typeof value === 'string' && (LANGS as readonly string[]).includes(value)
  );
}

/** Строка на языке `lang`; нет перевода (или он пустой) — русский и `fallback: true`. */
export function localize(
  field: LocalizedString | null | undefined,
  lang: LangCode
): Localized {
  if (!field) return { value: '', fallback: false };
  const own = field[lang];
  if (typeof own === 'string' && own.trim()) {
    return { value: own, fallback: false };
  }
  return { value: field.ru ?? '', fallback: lang !== 'ru' };
}

/**
 * Локализует несколько jsonb-полей объекта разом.
 * `fallback` — true, если хотя бы одно непустое поле отдано по-русски вместо `lang`.
 */
export function localizeFields<T extends object, K extends keyof T>(
  row: T,
  keys: readonly K[],
  lang: LangCode
): { values: Record<K, string>; fallback: boolean } {
  const values = {} as Record<K, string>;
  let fallback = false;
  for (const key of keys) {
    const res = localize(row[key] as LocalizedString | null | undefined, lang);
    values[key] = res.value;
    fallback = fallback || res.fallback;
  }
  return { values, fallback };
}
