import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminScheduleController } from './admin-schedule.controller';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { ChabadZmanimService } from './chabad/chabad-zmanim.service';
import { ScheduleOverrideEntity, ScheduleTemplateEntity } from './entities';

/**
 * Модуль «calendar»: еврейский календарь и расписание молитв. Времена (свечи, исход,
 * зманим) — с Chabad.org (ChabadZmanimService), запасной расчёт — @hebcal/core.
 * CalendarService экспортируется — requests (экскурсии, йорцайты) берёт его через DI.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduleTemplateEntity, ScheduleOverrideEntity]),
  ],
  controllers: [CalendarController, AdminScheduleController],
  providers: [CalendarService, ChabadZmanimService],
  exports: [CalendarService],
})
export class CalendarModule {}
