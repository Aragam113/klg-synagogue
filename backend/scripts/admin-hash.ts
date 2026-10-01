// Печатает bcrypt-хеш пароля редактора для ADMIN_USERS в backend/.env
// (формат: ADMIN_USERS="email:hash,email2:hash2").
// Использование: npm run admin:hash -- <пароль>
import { hashAdminPassword } from '../src/modules/admin/password-hash';

const password = process.argv[2];
if (!password) {
  process.stderr.write('Использование: npm run admin:hash -- <пароль>\n');
  process.exit(1);
}
process.stdout.write(hashAdminPassword(password) + '\n');
