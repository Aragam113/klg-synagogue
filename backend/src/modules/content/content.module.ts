import { Module } from '@nestjs/common';

/**
 * Модуль «content»: новости, события, сборы, программы, подразделения, галерея, настройки.
 * Подключён в AppModule; контроллеры, сервисы и TypeOrmModule.forFeature(...)
 * добавляет таск-владелец здесь, не трогая app.module.ts.
 */
@Module({})
export class ContentModule {}
