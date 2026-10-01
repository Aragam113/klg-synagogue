import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
}));
