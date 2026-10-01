import { INestApplication } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'path';
import appConfig from './config/app.config';
import { GlobalExceptionFilter } from './common/filters';
import { LoggingInterceptor, ResponseInterceptor } from './common/interceptors';
import { FieldValidationPipe } from './common/pipes';

/** Публичный префикс загруженных файлов: `/media/<файл>` ← `backend/uploads/<файл>`. */
export const MEDIA_PREFIX = '/media';

/**
 * Общая настройка HTTP-конвейера: её вызывают и main.ts, и e2e-тесты,
 * чтобы тесты шли через те же префикс, валидацию, обёртку ответа и фильтр ошибок.
 */
export function configureApp(app: INestApplication): void {
  const conf = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  app.setGlobalPrefix(conf.apiPrefix);

  (app as NestExpressApplication).useStaticAssets(resolve(conf.uploadDir), {
    prefix: MEDIA_PREFIX,
    index: false,
  });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(new FieldValidationPipe());

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor()
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
}
