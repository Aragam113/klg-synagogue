/**
 * «Ни одного выдуманного факта»: в статических текстах (src/content) и в src/config/site.ts
 * каждый телефон / e-mail / цена стоит рядом (та же строка или соседняя) с источником `src:`,
 * чужих (петербургских) фактов нет; шапка и подвал берут контакты из site.ts.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { CONTACTS, SOCIALS } from '@/ui/layout/slots/contacts';

const ROOT = join(__dirname, '..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|json)$/.test(f) ? [p] : [];
  });
const files = [...walk(join(ROOT, 'content')), join(ROOT, 'config', 'site.ts')].filter(
  (f) => !/\.test\.ts$/.test(f)
);

const PHONE = /\+7[\s(]*\d|\b\d{2}-\d{2}-\d{2}\b/;
const EMAIL = /[\w.-]+@[\w-]+\.[a-z]{2,}/i;
const PRICE = /\d\s?(₽|руб|RUB|ש"ח)|priceRub|\brub:\s*\d/i;

describe('facts in static content have a source', () => {
  it.each(files.map((f) => [f.slice(ROOT.length + 1)]))('%s', (rel) => {
    const lines = readFileSync(join(ROOT, rel), 'utf8').split('\n');
    const unsourced = lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => PHONE.test(line) || EMAIL.test(line) || PRICE.test(line))
      .filter(({ line, i }) => !/src:|ВПИШИ/.test([lines[i - 1], line, lines[i + 1]].join(' ')))
      .map(({ line, i }) => `${i + 1}: ${line.trim()}`);
    expect(unsourced).toEqual([]);
  });

  it('has no St. Petersburg facts', () => {
    const spb =
      /812|Лермонтовск|Петербург|Певзнер|Lermontov|Petersburg|Pevzner|פטרבורג|Лехаим|Малон/;
    const hits = files.filter((f) => spb.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});

describe('layout contacts come from site.ts', () => {
  it('fills the header/footer slot with the address, phone and e-mail of the community', () => {
    // Адрес и телефон/e-mail общины (OF-home 2026, FEOR).
    expect(CONTACTS.address?.ru).toBe('236006, Калининград, ул. Октябрьская, 1А');
    expect(CONTACTS.phone).toBe('+7 (4012) 46-43-45');
    expect(CONTACTS.email).toBe('Kaliningrad@feor.ru');
    expect(CONTACTS.mapUrl).toContain('yandex.ru/maps');
    expect(SOCIALS.find((s) => s.kind === 'vk')?.url).toBe('https://vk.com/jewish39');
  });
});
