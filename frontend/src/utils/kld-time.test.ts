import {
  formatHebrewDay,
  addDays,
  dateBadge,
  fmtDateTime,
  formatDate,
  formatDay,
  formatLocal,
  formatTime,
  isoToLocal,
  kaliningradNow,
  kaliningradToday,
  localeOf,
  localToIso,
  monthNames,
  monthOfDay,
} from '@/utils/kld-time';

// Калининград — UTC+2 круглый год: 22:30Z — это уже 00:30 следующего дня.
const LATE_OCT_31 = '2026-10-31T22:30:00Z';

describe('kaliningradNow / kaliningradToday', () => {
  it('после 22:00 UTC в Калининграде уже следующий день (и месяц)', () => {
    expect(kaliningradNow(Date.parse('2026-10-01T22:30:07Z'))).toEqual({
      date: '2026-10-02',
      time: '00:30:07',
    });
    expect(kaliningradNow(Date.parse(LATE_OCT_31))).toEqual({
      date: '2026-11-01',
      time: '00:30:00',
    });
    expect(kaliningradToday(new Date('2026-12-31T22:00:00Z'))).toBe('2027-01-01');
  });
  it('зимой тоже +2 (без перехода на летнее), полдень UTC — тот же день', () => {
    expect(kaliningradNow(Date.parse('2027-01-15T09:05:00Z'))).toEqual({
      date: '2027-01-15',
      time: '11:05:00',
    });
    expect(kaliningradToday(new Date('2026-10-01T09:00:00Z'))).toBe('2026-10-01');
  });
  it('ровно полночь по Калининграду — 00:00:00, а не 24:00:00', () => {
    expect(kaliningradNow(Date.parse('2026-10-01T22:00:00Z')).time).toBe('00:00:00');
  });
});

describe('addDays', () => {
  it('через границу месяца и года', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('localeOf', () => {
  it('ru/en/he → ru-RU/en-GB/he-IL, неизвестный → ru-RU', () => {
    expect(['ru', 'en', 'he', 'xx'].map(localeOf)).toEqual(['ru-RU', 'en-GB', 'he-IL', 'ru-RU']);
  });
});

describe('календарная дата (без сдвига пояса)', () => {
  it('formatDate: «1 октября» на трёх языках', () => {
    expect(formatDate('2026-10-01', 'ru')).toBe('1 октября');
    expect(formatDate('2026-10-01', 'en')).toBe('1 October');
    expect(formatDate('2026-10-01', 'he')).toBe('1 באוקטובר');
  });
  it('monthOfDay: месяц в родительном падеже рядом с числом', () => {
    expect(monthOfDay('2026-10-01', 'ru')).toBe('октября');
    expect(monthOfDay('2026-03-08', 'ru')).toBe('марта');
    expect(monthOfDay('2026-10-01', 'en')).toBe('October');
  });
  it('monthNames: 12 названий в именительном, с заглавной', () => {
    const ru = monthNames('ru');
    expect(ru).toHaveLength(12);
    expect(ru[0]).toBe('Январь');
    expect(ru[9]).toBe('Октябрь');
    expect(monthNames('en')[11]).toBe('December');
  });
});

describe('момент времени → по Калининграду', () => {
  it('formatDay: 22:30Z 31 октября — это 1 ноября', () => {
    expect(formatDay(LATE_OCT_31, 'ru')).toBe('1 ноября 2026 г.');
    expect(formatDay(LATE_OCT_31, 'en')).toBe('1 November 2026');
    expect(formatDay(LATE_OCT_31, 'he')).toBe('1 בנובמבר 2026');
  });
  it('formatTime: 24-часовое HH:MM на всех языках', () => {
    for (const lang of ['ru', 'en', 'he']) expect(formatTime(LATE_OCT_31, lang)).toBe('00:30');
  });
  it('dateBadge: число и короткий месяц без точки', () => {
    expect(dateBadge(LATE_OCT_31, 'ru')).toEqual({ day: '1', month: 'нояб' });
    expect(dateBadge(LATE_OCT_31, 'en')).toEqual({ day: '1', month: 'Nov' });
    expect(dateBadge(LATE_OCT_31, 'he')).toEqual({ day: '1', month: 'נוב׳' });
  });
});

describe('админка: datetime-local ↔ ISO по Калининграду', () => {
  it('isoToLocal / formatLocal через полночь и конец месяца', () => {
    expect(isoToLocal(LATE_OCT_31)).toBe('2026-11-01T00:30');
    expect(isoToLocal('2026-12-14T15:00:00.000Z')).toBe('2026-12-14T17:00');
    expect(formatLocal(LATE_OCT_31)).toBe('01.11.2026 00:30');
    expect(isoToLocal(null)).toBe('');
    expect(isoToLocal('мусор')).toBe('');
  });
  it('localToIso: поле → ISO со смещением Калининграда', () => {
    expect(localToIso('2026-12-14T17:00')).toBe('2026-12-14T17:00:00+02:00');
    expect(localToIso('2026-07-01T00:30')).toBe('2026-07-01T00:30:00+02:00');
    expect(localToIso('')).toBeNull();
  });
  it('fmtDateTime: «01.11.2026, 00:30», пусто → «—»', () => {
    expect(fmtDateTime(LATE_OCT_31)).toBe('01.11.2026, 00:30');
    expect(fmtDateTime(null)).toBe('—');
  });
});

describe('formatHebrewDay', () => {
  it('еврейская дата дня по Калининграду', () => {
    // 1 тишрея 5787 = 12.09.2026 (Рош а-Шана) → 28.09.2026 = 17 тишрея
    expect(formatHebrewDay('2026-09-28T10:00:00Z', 'en')).toBe('17 Tishri 5787');
    expect(formatHebrewDay('2026-09-28T10:00:00Z', 'ru')).toBe('17 тишрей 5787');
  });
});
