import { Module } from '@nestjs/common';

/**
 * Модуль «requests»: заявки публичных форм, регистрации на события, подписка.
 * Подключён в AppModule; контроллеры, сервисы и TypeOrmModule.forFeature(...)
 * добавляет таск-владелец здесь, не трогая app.module.ts.
 */
@Module({})
export class RequestsModule {}
