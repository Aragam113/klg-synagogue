import { payloadEntries, requestFilters } from './model';

describe('requests model', () => {
  it('содержимое заявки: пустое пропускается, списки через запятую, да/нет, вложенное — через точку', () => {
    expect(
      payloadEntries({
        prayerType: 'kaddish',
        names: ['Исаак', 'Ривка'],
        consent: true,
        comment: '',
        months: 3,
        reminder: { byEmail: false, deathDate: '2020-01-05' },
        website: null,
      })
    ).toEqual([
      ['prayerType', 'kaddish'],
      ['names', 'Исаак, Ривка'],
      ['consent', 'да'],
      ['months', '3'],
      ['reminder.byEmail', 'нет'],
      ['reminder.deathDate', '2020-01-05'],
    ]);
  });

  it('фильтр в строке адреса: только известные тип и статус, страница ≥ 1', () => {
    expect(requestFilters({ type: 'prayer', status: 'new', page: '2' })).toEqual({
      type: 'prayer',
      status: 'new',
      page: 2,
    });
    expect(requestFilters({ type: 'hack', status: 'x', page: '-3' })).toEqual({
      type: '',
      status: '',
      page: 1,
    });
  });
});
