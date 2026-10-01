import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminScheduleController } from './admin-schedule.controller';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { ScheduleOverrideEntity, ScheduleTemplateEntity } from './entities';

/**
 * Модуль «calendar»: еврейский календарь (@hebcal/core) и расписание молитв.
 * CalendarService экспортируется — requests (экскурсии, йорцайты) берёт его через DI.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduleTemplateEntity, ScheduleOverrideEntity]),
  ],
  controllers: [CalendarController, AdminScheduleController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
