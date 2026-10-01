import {
  overrideBody,
  overrideWindow,
  scheduleErrors,
  templateBody,
  templateForm,
  windowPageOf,
} from './model';

describe('schedule model: шаблон и исключения', () => {
  it('шаблон: null ↔ пустое поле, HH:MM сохраняется', () => {
    const form = templateForm({
      id: 1,
      weekday: { shacharit: '08:00', mincha: null, maariv: '20:00' },
      friday: { shacharit: '08:00', mincha: '18:00', maariv: null },
      shabbat: { shacharit: '10:00', mincha: null, maariv: null },
    });
    expect(form.weekday).toEqual({ shacharit: '08:00', mincha: '', maariv: '20:00' });
    form.weekday.mincha = '19:30';
    form.shabbat.shacharit = '';
    const body = templateBody(form);
    expect(body.weekday).toEqual({ shacharit: '08:00', mincha: '19:30', maariv: '20:00' });
    expect(body.shabbat.shacharit).toBeNull();
    expect(body).not.toHaveProperty('id');
  });

  it('время вне HH:MM — ошибка поля', () => {
    const form = templateForm(undefined);
    form.friday.mincha = '25:00';
    form.weekday.maariv = '7:5';
    expect(scheduleErrors(form)).toEqual({
      'friday.mincha': 'out_of_range',
      'weekday.maariv': 'out_of_range',
    });
  });

  it('исключение на дату: пустые времена → null (службы нет), примечание RU/EN/HE', () => {
    expect(
      overrideBody({
        date: '2026-12-25',
        shacharit: '09:00',
        mincha: '',
        maariv: '',
        note: { ru: 'Пост', en: '', he: '' },
      })
    ).toEqual({
      date: '2026-12-25',
      shacharit: '09:00',
      mincha: null,
      maariv: null,
      note: { ru: 'Пост' },
    });
  });
});

describe('schedule model: окно исключений (бэк отдаёт ≤ 62 дня за запрос)', () => {
  it('окно 0 — ближайшие 62 дня с сегодняшнего, дальше — следующие 62, назад — предыдущие', () => {
    expect(overrideWindow('2026-10-01', 0)).toEqual({ from: '2026-10-01', to: '2026-12-01' });
    expect(overrideWindow('2026-10-01', 1)).toEqual({ from: '2026-12-02', to: '2027-02-01' });
    expect(overrideWindow('2026-10-01', -1)).toEqual({ from: '2026-07-31', to: '2026-09-30' });
  });

  it('сохранённое исключение — окно, в котором его видно', () => {
    expect(windowPageOf('2026-10-01', '2026-10-01')).toBe(0);
    expect(windowPageOf('2026-10-01', '2026-12-01')).toBe(0);
    expect(windowPageOf('2026-10-01', '2026-12-02')).toBe(1);
    expect(windowPageOf('2026-10-01', '2026-09-30')).toBe(-1);
  });
});
