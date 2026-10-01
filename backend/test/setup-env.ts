// Окружение e2e-тестов: выставляется до загрузки приложения, поэтому
// значения из backend/.env (ConfigModule не перезаписывает process.env) не мешают.
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Логин/пароль роли synagogue берём из backend/.env (секрет не дублируется в коде).
const local = dotenv.config({ quiet: true }).parsed ?? {};

export const TEST_ADMIN_EMAIL = 'admin@test.local';
export const TEST_ADMIN_PASSWORD = 'e2e-admin-password';
export const TEST_EDITOR_EMAIL = 'editor2@test.local';
export const TEST_EDITOR_PASSWORD = 'e2e-editor-password';

process.env.NODE_ENV = 'test';
process.env.DB_HOST = local.DB_HOST ?? 'localhost';
process.env.DB_PORT = local.DB_PORT ?? '5432';
process.env.DB_USERNAME = local.DB_USERNAME ?? 'synagogue';
process.env.DB_PASSWORD = local.DB_PASSWORD ?? '';
process.env.DB_DATABASE =
  process.env.TEST_DB_DATABASE || local.TEST_DB_DATABASE || 'synagogue_test';
process.env.JWT_SECRET = 'e2e-only-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ADMIN_USERS = [
  `${TEST_ADMIN_EMAIL}:${bcrypt.hashSync(TEST_ADMIN_PASSWORD, 4)}`,
  `${TEST_EDITOR_EMAIL}:${bcrypt.hashSync(TEST_EDITOR_PASSWORD, 4)}`,
].join(',');
// Высокий лимит форм, чтобы e2e других модулей не упирались в 429;
// тест лимита поднимает своё приложение с FORMS_RATE_LIMIT=10.
process.env.FORMS_RATE_LIMIT = '1000';
process.env.SWAGGER_ENABLED = 'false';
process.env.UPLOAD_DIR = './test/fixtures/uploads';
process.env.PAYMENT_MODE = 'fake';
