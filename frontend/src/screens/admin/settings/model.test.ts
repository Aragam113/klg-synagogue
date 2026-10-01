import { settingsBody, settingsErrors, settingsForm } from './model';

const server = {
  supporters_offset: 120,
  kaddish_month_rub: null,
  requisites: { ru: 'Р/с 4070…', en: 'Account 4070…' },
  operator: null,
  socials: [{ name: 'VK', url: 'https://vk.com/x' }],
  header_phones: ['+7 (4012) 00-00-00'],
};

describe('settings model', () => {
  it('сервер → форма → тело: snake_case ключи, соцсети «Имя | url» построчно', () => {
    const form = settingsForm(server);
    expect(form.socials).toBe('VK | https://vk.com/x');
    expect(form.kaddish_month_rub).toBe('');
    form.socials = 'VK | https://vk.com/x\nTelegram | https://t.me/y\n';
    form.kaddish_month_rub = '1800';
    expect(settingsBody(form)).toEqual({
      supporters_offset: 120,
      kaddish_month_rub: 1800,
      requisites: { ru: 'Р/с 4070…', en: 'Account 4070…' },
      operator: null,
      socials: [
        { name: 'VK', url: 'https://vk.com/x' },
        { name: 'Telegram', url: 'https://t.me/y' },
      ],
      header_phones: ['+7 (4012) 00-00-00'],
    });
  });

  it('очищенные поля уходят как null (PUT /admin/settings с null удаляет ключ)', () => {
    const form = settingsForm({ ...server, kaddish_month_rub: 1800 });
    form.requisites = { ru: '', en: '', he: '' };
    form.kaddish_month_rub = ' ';
    const body = settingsBody(form);
    expect(body.requisites).toBeNull();
    expect(body.kaddish_month_rub).toBeNull();
    expect(body.operator).toBeNull();
    expect(body.supporters_offset).toBe(120);
  });

  it('соцсеть без https-ссылки и нечисловой тариф — ошибки полей', () => {
    const form = settingsForm(server);
    form.socials = 'VK vk.com/x';
    form.kaddish_month_rub = 'сто';
    form.supporters_offset = '-1';
    expect(settingsErrors(form)).toEqual({
      socials: 'url',
      kaddish_month_rub: 'out_of_range',
      supporters_offset: 'out_of_range',
    });
  });
});
