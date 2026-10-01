import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from '@modules/content/entities/event.entity';
import {
  EventRegistrationEntity,
  RequestEntity,
  SubscriberEntity,
  YahrzeitReminderEntity,
} from './entities';
import { RequestsController, SubscribeController } from './requests.controller';
import { RequestsAdminController } from './requests-admin.controller';
import { RequestsService } from './requests.service';
import { CalendarModule } from '@modules/calendar';

/**
 * Модуль «requests»: заявки публичных форм, регистрации на события, подписка.
 * Еврейский календарь (закрытые дни экскурсий, годовщины) — CalendarService.
 */
@Module({
  imports: [
    CalendarModule,
    TypeOrmModule.forFeature([
      RequestEntity,
      EventRegistrationEntity,
      SubscriberEntity,
      YahrzeitReminderEntity,
      EventEntity,
    ]),
  ],
  controllers: [
    RequestsController,
    SubscribeController,
    RequestsAdminController,
  ],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
