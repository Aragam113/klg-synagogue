import type { PublicSettings } from '@/store/api/content';

import { pickContacts } from './contacts';

const settings = (p: Partial<PublicSettings>): PublicSettings => ({
  supportersCount: 0,
  kaddishMonthRub: null,
  requisites: null,
  operator: null,
  socials: [],
  headerPhones: [],
  fallback: false,
  ...p,
});

describe('pickContacts: настройка из админки, иначе SITE', () => {
  it('без настроек (API недоступен) — телефон и соцсети из site.ts', () => {
    const c = pickContacts(undefined);
    expect(c.phone).toBe('+7 (4012) 46-43-45');
    expect(c.socials).toContainEqual({ kind: 'vk', url: 'https://vk.com/jewish39' });
    expect(c.operator).toBeNull();
  });

  it('заполненные настройки побеждают', () => {
    const c = pickContacts(
      settings({
        headerPhones: ['+7 (4012) 00-00-01'],
        socials: [{ name: 'Telegram', url: 'https://t.me/kld_test' }],
        operator: 'МРОЕО «Тест», ИНН 0000000000',
        requisites: 'р/с 000',
      })
    );
    expect(c.phone).toBe('+7 (4012) 00-00-01');
    expect(c.socials).toEqual([{ kind: 'telegram', url: 'https://t.me/kld_test' }]);
    expect(c.operator).toBe('МРОЕО «Тест», ИНН 0000000000');
    expect(c.requisites).toBe('р/с 000');
  });

  it('заглушки [ВПИШИ] и пустое в настройках — считаются незаполненными', () => {
    const c = pickContacts(
      settings({
        headerPhones: ['[ВПИШИ: телефон в шапке]'],
        socials: [{ name: 'Telegram', url: '' }],
        operator: '[ВПИШИ: оператор ПДн]',
      })
    );
    expect(c.phone).toBe('+7 (4012) 46-43-45');
    expect(c.socials).toContainEqual({ kind: 'vk', url: 'https://vk.com/jewish39' });
    expect(c.operator).toBeNull();
  });
});
