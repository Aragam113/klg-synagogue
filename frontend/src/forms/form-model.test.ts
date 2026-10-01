import { errorMessageKey, minExcursionDate, nearestYizkor } from './form-model';

describe('minExcursionDate: не раньше чем через 3 дня по Калининграду', () => {
  it('днём 1 октября → 4 октября', () => {
    expect(minExcursionDate(new Date('2026-10-01T09:00:00Z'))).toBe('2026-10-04');
  });
  it('22:30 UTC 1 октября — в Калининграде (UTC+2) уже 2 октября → 5 октября', () => {
    expect(minExcursionDate(new Date('2026-10-01T22:30:00Z'))).toBe('2026-10-05');
  });
  it('через границу месяца', () => {
    expect(minExcursionDate(new Date('2026-10-30T09:00:00Z'))).toBe('2026-11-02');
  });
});

describe('nearestYizkor: ближайший Изкор по ответам календарного API (диаспора)', () => {
  // Ответы GET /calendar/holidays/:key?year= (даты 2026 — живой ответ API; 2027 — по hebcal, диаспора).
  const d = (date: string, name = '') => ({ date, name });
  const holidays = [
    {
      key: 'yom-kippur',
      dates: [d('2026-09-20', 'Erev Yom Kippur'), d('2026-09-21', 'Yom Kippur')],
    },
    { key: 'shmini-atzeret', dates: [d('2026-10-03', 'Shmini Atzeret')] },
    { key: 'pesach', dates: [d('2026-04-01'), d('2026-04-02'), d('2026-04-08'), d('2026-04-09')] },
    { key: 'shavuot', dates: [d('2026-05-21'), d('2026-05-22'), d('2026-05-23')] },
    { key: 'yom-kippur', dates: [d('2027-10-10'), d('2027-10-11')] },
    { key: 'shmini-atzeret', dates: [d('2027-10-23')] },
    { key: 'pesach', dates: [d('2027-04-21'), d('2027-04-22'), d('2027-04-29')] },
    { key: 'shavuot', dates: [d('2027-06-10'), d('2027-06-11'), d('2027-06-12')] },
  ];
  it('1 октября 2026 → Шмини Ацерет (3 октября)', () => {
    expect(nearestYizkor('2026-10-01', holidays)).toBe('shmini_atzeret');
  });
  it('в сам день праздника — он и есть ближайший', () => {
    expect(nearestYizkor('2026-10-03', holidays)).toBe('shmini_atzeret');
  });
  it('Изкор — последний день праздника: 9 апреля 2026 ещё Песах, 23 мая — Шавуот', () => {
    expect(nearestYizkor('2026-04-09', holidays)).toBe('pesach');
    expect(nearestYizkor('2026-05-23', holidays)).toBe('shavuot');
  });
  it('после Шмини Ацерет → Песах; после Песаха → Шавуот', () => {
    expect(nearestYizkor('2026-10-04', holidays)).toBe('pesach');
    expect(nearestYizkor('2027-05-01', holidays)).toBe('shavuot');
  });
  it('после Шавуота → Йом Кипур', () => {
    expect(nearestYizkor('2027-06-13', holidays)).toBe('yom_kippur');
  });
  it('данных ещё нет → null (поле остаётся пустым до ответа API)', () => {
    expect(nearestYizkor('2026-10-01', [])).toBeNull();
  });
});

describe('errorMessageKey: машинный ключ API → ключ i18n + параметры', () => {
  it('seats_left:N → seats_left с числом мест', () => {
    expect(errorMessageKey('seats_left:3')).toEqual({ key: 'seats_left', params: { n: 3 } });
  });

  it('обычный ключ — как есть, без параметров', () => {
    expect(errorMessageKey('date_closed')).toEqual({ key: 'date_closed', params: {} });
  });
});
