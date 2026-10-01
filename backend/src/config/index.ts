import appConfig from './app.config';
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import jwtConfig from './jwt.config';
import emailConfig from './email.config';
import storageConfig from './storage.config';
import swaggerConfig from './swagger.config';
import adminConfig from './admin.config';

export default [
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  emailConfig,
  storageConfig,
  swaggerConfig,
  adminConfig,
];

export {
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  emailConfig,
  storageConfig,
  swaggerConfig,
  adminConfig,
};
