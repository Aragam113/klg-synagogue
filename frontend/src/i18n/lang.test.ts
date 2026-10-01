import { buildResources, dirOf, resolveInitialLang } from '@/i18n/lang';

describe('buildResources', () => {
  it('maps ./<lang>/<ns>.json files to i18next resources', () => {
    const res = buildResources([
      ['./ru/common.json', { hello: 'privet' }],
      ['./en/common.json', { hello: 'hello' }],
      ['./he/schedule.json', { title: 'x' }],
      ['./ru/schedule.json', { title: 'y' }],
    ]);
    expect(res).toEqual({
      ru: { common: { hello: 'privet' }, schedule: { title: 'y' } },
      en: { common: { hello: 'hello' } },
      he: { schedule: { title: 'x' } },
    });
  });

  it('ignores files of unknown languages', () => {
    expect(buildResources([['./es/common.json', { a: 1 }]])).toEqual({});
  });
});

describe('resolveInitialLang', () => {
  it('prefers ?lang= over stored choice', () => {
    expect(resolveInitialLang({ query: 'he', stored: 'en' })).toBe('he');
  });
  it('falls back to stored, then ru', () => {
    expect(resolveInitialLang({ query: 'xx', stored: 'en' })).toBe('en');
    expect(resolveInitialLang({ query: null, stored: null })).toBe('ru');
  });
});

describe('dirOf', () => {
  it('is rtl only for Hebrew', () => {
    expect(dirOf('he')).toBe('rtl');
    expect(dirOf('ru')).toBe('ltr');
    expect(dirOf('en')).toBe('ltr');
  });
});
