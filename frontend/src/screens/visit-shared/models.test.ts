/** Что модели разделов отдают во view: выбор факта и его alt («уточняйте»), формат под язык. */
import { getContent } from '@/content';

import { contactsModel } from '../contacts/model';
import { legalModel } from '../legal/model';
import { excursionsModel } from '../visit-excursions/model';
import { hoursModel } from '../visit-hours/model';
import { howToModel } from '../visit-how-to/model';
import { museumModel } from '../visit-museum/model';

const ru = getContent('ru');
const en = getContent('en');

describe('hoursModel', () => {
  it('основные сеансы офсайта и расходящиеся варианты одной строкой', () => {
    const m = hoursModel(ru);
    expect(m.slots[0]).toBe('11:00');
    expect(m.slots[m.slots.length - 1]).toBe('19:00');
    expect(m.slotVariants).toBe('11:00–17:00 / 13:00–16:00');
    expect(m.museum.friWinter).toBe('11:00–15:00');
    expect(m.museumFriAlt).toBe('11:00–14:00');
  });
});

describe('museumModel / excursionsModel — рубли под язык', () => {
  it('2ГИС основная цена, сайт музея — вариант', () => {
    const m = museumModel(ru, 'ru');
    expect(m.prices.adult).toBe('550 ₽');
    expect(m.priceAlt.adult).toBe('500 ₽');
  });
  it('на EN разделитель тысяч английский', () => {
    expect(excursionsModel(en, 'en').prices.walking).toBe('4,500 ₽');
    expect(excursionsModel(ru, 'ru').prices.standard).toBe('300 ₽');
  });
});

describe('howToModel', () => {
  it('остановка на языке страницы, маршруты, карты с координатами', () => {
    const m = howToModel(en, 'en');
    expect(m.transport.stop).toBe('Rybnaya Derevnya (Fish Village)');
    expect(m.transport.bus).toBe('21, 40');
    expect(m.maps.yandex).toContain('54.7056');
    expect(m.address).toContain('Kaliningrad');
  });
});

describe('contactsModel', () => {
  it('телефон общины уходит во view вместе с вариантом «уточняйте»', () => {
    const m = contactsModel(ru, 'ru', []);
    const community = m.groups.find((g) => g.key === 'community');
    expect(community?.phone.value).toBe('+7 (4012) 46-43-45');
    expect(community?.phone.alt?.[0].value).toBe('+7 (4012) 99-41-94');
  });
  it('соцсети — из переданных (настройки или SITE), сайт музея добавляется', () => {
    const m = contactsModel(ru, 'ru', [{ kind: 'telegram', url: 'https://t.me/x' }]);
    expect(m.socials.map((s) => s.url)).toEqual(['https://t.me/x', 'https://jmkaliningrad.org']);
  });
});

describe('legalModel', () => {
  it('оператор из настроек заменяет заглушку наименования организации', () => {
    const text = JSON.stringify(legalModel(ru, 'privacy', 'ООО «Тест»').doc);
    expect(text).toContain('ООО «Тест»');
    expect(text).not.toContain('[ВПИШИ: наименование организации');
  });
  it('без оператора заглушка остаётся', () => {
    expect(JSON.stringify(legalModel(ru, 'consent', null).doc)).toContain(
      '[ВПИШИ: наименование организации'
    );
  });
});
