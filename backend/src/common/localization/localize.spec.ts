import { localize, localizeFields } from './localize';

describe('localize', () => {
  const title = { ru: 'Шаббат', en: 'Shabbat', he: 'שבת' };

  it('отдаёт строку на запрошенном языке без fallback', () => {
    expect(localize(title, 'en')).toEqual({
      value: 'Shabbat',
      fallback: false,
    });
    expect(localize(title, 'he')).toEqual({ value: 'שבת', fallback: false });
    expect(localize(title, 'ru')).toEqual({ value: 'Шаббат', fallback: false });
  });

  it('нет перевода — русский и fallback:true', () => {
    expect(localize({ ru: 'Новости' }, 'en')).toEqual({
      value: 'Новости',
      fallback: true,
    });
  });

  it('пустой или пробельный перевод считается отсутствующим', () => {
    expect(localize({ ru: 'Новости', he: '  ' }, 'he')).toEqual({
      value: 'Новости',
      fallback: true,
    });
  });

  it('пустое поле — пустая строка без fallback', () => {
    expect(localize(null, 'en')).toEqual({ value: '', fallback: false });
  });

  it('localizeFields: строки по полям и общий fallback, если хоть одно поле без перевода', () => {
    const row = { slug: 'x', title: { ru: 'Т', en: 'T' }, lead: { ru: 'Л' } };
    expect(localizeFields(row, ['title', 'lead'], 'en')).toEqual({
      values: { title: 'T', lead: 'Л' },
      fallback: true,
    });
    expect(localizeFields(row, ['title'], 'en')).toEqual({
      values: { title: 'T' },
      fallback: false,
    });
  });
});
