import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import i18next from 'i18next';

import { pageTitle } from '@/ui/kit/page-title';

import en from './locales/en/common.json';
import he from './locales/he/common.json';
import ru from './locales/ru/common.json';

/** Site brand: «Новая синагога», in full «Новая синагога, Калининград». */
const make = async () => {
  const i = i18next.createInstance();
  await i.init({
    resources: { ru: { common: ru }, en: { common: en }, he: { common: he } },
    lng: 'ru',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });
  return i;
};

describe('site name (common:site.*)', () => {
  it.each([
    ['ru', 'Новая синагога', 'Калининград', 'Новая синагога, Калининград'],
    ['en', 'New Synagogue', 'Kaliningrad', 'New Synagogue, Kaliningrad'],
    ['he', 'בית הכנסת החדש', 'קלינינגרד', 'בית הכנסת החדש, קלינינגרד'],
  ])('%s: brand, city and full name', async (lng, name, city, full) => {
    const t = (await make()).getFixedT(lng, 'common');
    expect(t('site.name')).toBe(name);
    expect(t('site.city')).toBe(city);
    expect(t('site.full')).toBe(full);
  });

  it('page <title> = "<page> — <full name>", the home page is just the full name', () => {
    expect(pageTitle('Расписание', 'Новая синагога, Калининград')).toBe(
      'Расписание — Новая синагога, Калининград'
    );
    expect(pageTitle(undefined, 'Новая синагога, Калининград')).toBe('Новая синагога, Калининград');
    expect(pageTitle('Новая синагога, Калининград', 'Новая синагога, Калининград')).toBe(
      'Новая синагога, Калининград'
    );
  });

  it('the old name «Синагога Калининграда» is gone from the locales', () => {
    const dir = join(__dirname, 'locales');
    for (const lng of readdirSync(dir)) {
      for (const f of readdirSync(join(dir, lng))) {
        const text = readFileSync(join(dir, lng, f), 'utf8');
        expect([
          `${lng}/${f}`,
          /Синагога Калининграда|Kaliningrad Synagogue|בית הכנסת של קלינינגרד/.test(text),
        ]).toEqual([`${lng}/${f}`, false]);
      }
    }
  });
});
