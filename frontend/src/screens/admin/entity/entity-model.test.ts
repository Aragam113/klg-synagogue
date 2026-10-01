import { ENTITIES, emptyForm, errorFor, isDirty, toBody, toForm, validate } from './entity-model';

const news = ENTITIES.news;
const events = ENTITIES.events;

describe('entity-model: формы сущностей админки', () => {
  it('RU обязателен у заголовка: пустой ru → title.ru=required, пустые en/he не уходят в тело', () => {
    const form = emptyForm(news);
    expect(validate(news, form)['title.ru']).toBe('required');
    form.title = { ru: 'Ханука в общине', en: '', he: '  ' };
    form.body = { ru: 'Текст', en: 'Text', he: '' };
    expect(validate(news, form)['title.ru']).toBeUndefined();
    const body = toBody(news, form);
    expect(body.title).toEqual({ ru: 'Ханука в общине' });
    expect(body.body).toEqual({ ru: 'Текст', en: 'Text' });
  });

  it('необязательное локализуемое поле без ru → null (лид новости)', () => {
    const form = emptyForm(news);
    expect(toBody(news, form).lead).toBeNull();
  });

  it('дата-время события — по Калининграду (UTC+2): ISO ↔ поле datetime-local', () => {
    const form = toForm(events, {
      title: { ru: 'Лекция' },
      startsAt: '2026-12-14T15:00:00.000Z',
      endsAt: null,
    });
    expect(form.startsAt).toBe('2026-12-14T17:00');
    expect(form.endsAt).toBe('');
    const body = toBody(events, form);
    expect(body.startsAt).toBe('2026-12-14T17:00:00+02:00');
    expect(body.endsAt).toBeNull();
  });

  it('лимит мест: пусто → null (без лимита), число → int, мусор → ошибка', () => {
    const form = emptyForm(events);
    form.title = { ru: 'Лекция', en: '', he: '' };
    form.description = { ru: 'О чём', en: '', he: '' };
    form.startsAt = '2026-12-14T17:00';
    expect(toBody(events, form).capacity).toBeNull();
    form.capacity = '40';
    expect(toBody(events, form).capacity).toBe(40);
    form.capacity = '4x';
    expect(validate(events, form).capacity).toBe('out_of_range');
    form.capacity = '0';
    expect(validate(events, form).capacity).toBe('out_of_range');
  });

  it('лестница цен: строки → [{until|null, priceRub}], пустые строки отбрасываются', () => {
    const form = toForm(events, {
      title: { ru: 'Концерт' },
      priceTiers: [
        { until: '2026-11-01', priceRub: 500 },
        { until: null, priceRub: 800 },
      ],
    });
    expect(form.priceTiers).toEqual([
      { until: '2026-11-01', price: '500' },
      { until: '', price: '800' },
    ]);
    (form.priceTiers as { until: string; price: string }[]).push({ until: '', price: '' });
    expect(toBody(events, form).priceTiers).toEqual([
      { until: '2026-11-01', priceRub: 500 },
      { until: null, priceRub: 800 },
    ]);
    form.priceTiers = [{ until: '2026-11-01', price: 'дорого' }];
    expect(validate(events, form).priceTiers).toBe('out_of_range');
  });

  it('телефоны подразделения — по строке на телефон', () => {
    const deps = ENTITIES.departments;
    const form = toForm(deps, { title: { ru: 'Детский сад' }, phones: ['+7 1', '+7 2'] });
    expect(form.phones).toBe('+7 1\n+7 2');
    form.phones = '+7 1\n\n  +7 3  \n';
    expect(toBody(deps, form).phones).toEqual(['+7 1', '+7 3']);
  });

  it('ошибка поля с сервера находит своё поле по первому сегменту ключа', () => {
    const errs = { 'title.ru': 'required', 'priceTiers.0.priceRub': 'out_of_range' };
    expect(errorFor(errs, 'title')).toBe('required');
    expect(errorFor(errs, 'priceTiers')).toBe('out_of_range');
    expect(errorFor(errs, 'capacity')).toBeUndefined();
  });

  it('несохранённые изменения: форма отличается от исходной', () => {
    const a = toForm(news, { title: { ru: 'А' }, body: { ru: 'Б' } });
    const b = toForm(news, { title: { ru: 'А' }, body: { ru: 'Б' } });
    expect(isDirty(a, b)).toBe(false);
    b.title = { ...(b.title as object), en: 'A' } as typeof b.title;
    expect(isDirty(a, b)).toBe(true);
  });
});
