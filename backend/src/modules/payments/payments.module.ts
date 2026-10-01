import { Module } from '@nestjs/common';

/**
 * Модуль «payments»: платежи, ежемесячные пожертвования, касса.
 * Подключён в AppModule; контроллеры, сервисы и TypeOrmModule.forFeature(...)
 * добавляет таск-владелец здесь, не трогая app.module.ts.
 */
@Module({})
export class PaymentsModule {}
