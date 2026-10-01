import en from './locales/en/common.json';
import he from './locales/he/common.json';
import ru from './locales/ru/common.json';

// Ключи полей, которые отдаёт бэкенд (backend/src/common/pipes/field-validation.pipe.ts):
// сырой ключ пользователю показываться не должен ни на одном языке.
const API_KEYS = [
  'required',
  'email',
  'phone',
  'too_long',
  'too_short',
  'too_large',
  'too_small',
  'integer',
  'number',
  'boolean',
  'invalid_choice',
  'date',
  'invalid_format',
  'url',
  'unknown_field',
  'invalid',
];

describe('common:fieldErrors', () => {
  it.each([
    ['ru', ru],
    ['en', en],
    ['he', he],
  ])('%s: переведены все ключи ошибок полей API', (_lang, dict) => {
    const fe = dict.fieldErrors as Record<string, string>;
    expect(API_KEYS.filter((k) => !fe[k])).toEqual([]);
  });
});
