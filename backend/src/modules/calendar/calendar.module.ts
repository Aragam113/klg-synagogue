import { Module } from '@nestjs/common';

/**
 * Модуль «calendar»: еврейский календарь и расписание молитв.
 * Подключён в AppModule; контроллеры, сервисы и TypeOrmModule.forFeature(...)
 * добавляет таск-владелец здесь, не трогая app.module.ts.
 */
@Module({})
export class CalendarModule {}
