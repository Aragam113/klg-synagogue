import { registerAs } from '@nestjs/config';

export interface AdminUser {
  email: string;
  passwordHash: string;
}

/** `ADMIN_USERS="email:bcrypthash,email2:hash"` → список учёток (email в нижнем регистре). */
export function parseAdminUsers(raw: string | undefined): AdminUser[] {
  return (raw ?? '')
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf(':');
      return {
        email: pair.slice(0, i).trim().toLowerCase(),
        passwordHash: pair.slice(i + 1).trim(),
      };
    })
    .filter((u) => u.email && u.passwordHash);
}

export default registerAs('admin', () => ({
  users: parseAdminUsers(process.env.ADMIN_USERS),
}));
