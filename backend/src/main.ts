import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigType } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as basicAuth from 'express-basic-auth';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import appConfig from './config/app.config';
import swaggerConfig from './config/swagger.config';

async function bootstrap() {
  // rawBody: пригодится для подписи уведомлений настоящей кассы
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const appConf = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  const swaggerConf = app.get<ConfigType<typeof swaggerConfig>>(
    swaggerConfig.KEY
  );

  configureApp(app);

  if (swaggerConf.enabled) {
    if (
      appConf.nodeEnv === 'production' &&
      swaggerConf.user &&
      swaggerConf.password
    ) {
      app.use(
        ['/docs', '/docs-json'],
        basicAuth({
          challenge: true,
          users: { [swaggerConf.user]: swaggerConf.password },
        })
      );
    }

    const config = new DocumentBuilder()
      .setTitle(swaggerConf.title)
      .setDescription(swaggerConf.description)
      .setVersion(swaggerConf.version)
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(appConf.port);

  console.log(`
  Synagogue Backend is running!

  Environment: ${appConf.nodeEnv}
  Port: ${appConf.port}
  API Prefix: ${appConf.apiPrefix}

  Swagger: ${swaggerConf.enabled ? `http://localhost:${appConf.port}/docs` : 'disabled'}
  Health: http://localhost:${appConf.port}/${appConf.apiPrefix}/health
  `);
}

bootstrap();
