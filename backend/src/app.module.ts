import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import configs from './config';
import { DatabaseModule } from './shared/database';
import { HealthController } from './health.controller';
import { AdminModule } from './modules/admin';
import { CalendarModule } from './modules/calendar';
import { ContentModule } from './modules/content';
import { RequestsModule } from './modules/requests';
import { PaymentsModule } from './modules/payments';

// Redis, очереди, почта, nestjs-i18n и FileStorage шаблона намеренно не подключены
// по замыслу: писем нет, файлы — локальный диск /media.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: ['.env'],
    }),
    // Лимит публичных форм (@PublicForm): FORMS_RATE_LIMIT отправок за 60 с с одного IP.
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          name: 'forms',
          ttl: 60_000,
          limit: parseInt(process.env.FORMS_RATE_LIMIT || '10', 10),
        },
      ],
    }),
    DatabaseModule,

    AdminModule,
    CalendarModule,
    ContentModule,
    RequestsModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
