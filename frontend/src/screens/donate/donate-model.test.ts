import {
  PRESETS,
  amountError,
  confirmTarget,
  dedicationItems,
  eventTotal,
  kaddishTotal,
  paymentBody,
  pollStep,
} from './donate-model';

describe('donate-model', () => {
  it('пресеты кратны «хай» (18)', () => {
    expect(PRESETS).toEqual([180, 360, 540, 1800, 3600, 18000]);
  });

  it('сумма: 100–1 000 000, целое', () => {
    expect(amountError('')).toBe('required');
    expect(amountError('99')).toBe('out_of_range');
    expect(amountError('100')).toBeUndefined();
    expect(amountError('1 000 000')).toBeUndefined();
    expect(amountError('1000001')).toBe('out_of_range');
    expect(amountError('12,5')).toBe('out_of_range');
  });

  it('Кадиш: месяцы × тариф; без тарифа — null (свободная сумма)', () => {
    expect(kaddishTotal(3, 1800)).toBe(5400);
    expect(kaddishTotal(3, null)).toBeNull();
    expect(kaddishTotal(undefined, 1800)).toBeNull();
  });

  it('билет: места × цена на сегодня; без цены или мест — null', () => {
    expect(eventTotal(2, 700)).toBe(1400);
    expect(eventTotal(1, 900)).toBe(900);
    expect(eventTotal(2, null)).toBeNull();
    expect(eventTotal(undefined, 700)).toBeNull();
    expect(eventTotal(0, 700)).toBeNull();
  });

  it('опрос статуса: раз в 3 с до итога, не дольше 2 минут', () => {
    expect(pollStep('pending', 0, 3000)).toBe('wait');
    expect(pollStep('paid', 0, 3000)).toBe('done');
    expect(pollStep('canceled', 0, 3000)).toBe('done');
    expect(pollStep('pending', 0, 120_001)).toBe('timeout');
  });

  it('тело платежа: анонимно — без имени; пустые поля не отправляются', () => {
    expect(
      paymentBody(
        {
          amount: '360',
          recurring: true,
          anonymous: true,
          donorName: 'Анна',
          email: ' a@b.ru ',
          phone: '',
          comment: '',
          dedication: 'Светлой памяти',
          consent: true,
        },
        { purpose: 'donation', fundraiserSlug: 'roof' }
      )
    ).toEqual({
      purpose: 'donation',
      fundraiserSlug: 'roof',
      amountRub: 360,
      recurring: true,
      anonymous: true,
      email: 'a@b.ru',
      dedication: 'Светлой памяти',
      consent: true,
    });
  });
});

describe('confirmTarget', () => {
  it('относительная ссылка тестовой кассы — переход внутри сайта', () => {
    expect(confirmTarget('/dev-pay/abc?token=t1')).toEqual({ internal: '/dev-pay/abc?token=t1' });
  });
  it('внешняя касса — переход по полному адресу', () => {
    expect(confirmTarget('https://pay.example/x')).toEqual({ external: 'https://pay.example/x' });
  });
});

describe('dedicationItems', () => {
  it('имя или «Анонимно», текст курсивом', () => {
    expect(
      dedicationItems(
        [
          { id: '1', name: 'Анна', anonymous: false, text: 'За здоровье мамы', date: '2026-10-01' },
          { id: '2', name: null, anonymous: true, text: 'Светлая память', date: '2026-10-01' },
        ],
        'Анонимно'
      )
    ).toEqual([
      { text: 'Анна' },
      { text: 'За здоровье мамы', italic: true },
      { text: 'Анонимно' },
      { text: 'Светлая память', italic: true },
    ]);
  });
});
