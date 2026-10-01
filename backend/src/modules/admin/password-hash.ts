import * as bcrypt from 'bcrypt';

/** Стоимость bcrypt для паролей редакторов: общая для `npm run admin:hash` и хеша-пустышки. */
export const BCRYPT_COST = 12;

export function hashAdminPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_COST);
}
