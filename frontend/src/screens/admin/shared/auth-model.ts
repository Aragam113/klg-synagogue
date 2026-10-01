export const ADMIN_HOME = '/admin/requests';
export const ADMIN_LOGIN = '/admin/login';

const b64urlDecode = (s: string): string => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof atob === 'function') {
    const bin = atob(padded);
    return decodeURIComponent(
      Array.from(bin, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
    );
  }
  return Buffer.from(padded, 'base64').toString('utf8');
};

/** Токен истёк (или его нет / он не JWT). Подпись проверяет сервер; клиент смотрит только `exp`. */
export const tokenExpired = (token: string | null | undefined, nowMs: number): boolean => {
  if (!token) return true;
  const parts = token.split('.');
  if (parts.length !== 3) return true;
  try {
    const payload = JSON.parse(b64urlDecode(parts[1])) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 <= nowMs : false;
  } catch {
    return true;
  }
};

/** Куда вернуться после логина: только внутренний /admin-путь. */
export const loginTarget = (next: string | undefined | null): string =>
  next && /^\/admin(\/|$)/.test(next) && !next.startsWith(ADMIN_LOGIN) ? next : ADMIN_HOME;
