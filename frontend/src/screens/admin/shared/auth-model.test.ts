import { loginTarget, tokenExpired } from './auth-model';

/** JWT с заданным payload (подпись не проверяется на клиенте). */
const jwt = (payload: object) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;

describe('auth-model', () => {
  const now = Date.UTC(2026, 9, 1, 12, 0, 0);

  it('токен с exp в прошлом — истёк; в будущем — жив', () => {
    expect(tokenExpired(jwt({ sub: 'a', exp: now / 1000 - 1 }), now)).toBe(true);
    expect(tokenExpired(jwt({ sub: 'a', exp: now / 1000 + 3600 }), now)).toBe(false);
  });

  it('нет токена или он не JWT — считается истёкшим; без exp — живой', () => {
    expect(tokenExpired(null, now)).toBe(true);
    expect(tokenExpired('мусор', now)).toBe(true);
    expect(tokenExpired(jwt({ sub: 'a' }), now)).toBe(false);
  });

  it('после логина возвращает туда, откуда выгнали, но только внутри /admin', () => {
    expect(loginTarget('/admin/news/123')).toBe('/admin/news/123');
    expect(loginTarget(undefined)).toBe('/admin/requests');
    expect(loginTarget('https://evil.example')).toBe('/admin/requests');
    expect(loginTarget('/admin/login')).toBe('/admin/requests');
  });
});
