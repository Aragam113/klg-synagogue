import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  // Без значения по умолчанию: пустой секрет не даёт запустить админ-модуль.
  secret: process.env.JWT_SECRET ?? '',
  expiresIn: process.env.JWT_EXPIRES_IN || '12h',
}));
