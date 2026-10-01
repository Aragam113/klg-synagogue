import { registerAs } from '@nestjs/config';

export default registerAs('swagger', () => ({
  enabled: process.env.SWAGGER_ENABLED !== 'false',
  user: process.env.SWAGGER_USER ?? '',
  password: process.env.SWAGGER_PASSWORD ?? '',
  title: process.env.SWAGGER_TITLE ?? 'Синагога Калининграда API',
  description:
    process.env.SWAGGER_DESCRIPTION ?? 'API сайта синагоги Калининграда',
  version: process.env.SWAGGER_VERSION ?? '1.0',
}));
