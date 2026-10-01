import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Lang } from '@common/decorators';
import type { LangCode } from '@common/localization';
import {
  CalendarService,
  Day,
  HolidayPage,
  TodayInfo,
} from './calendar.service';
import { kaliningradDate } from './kaliningrad-time';

@ApiTags('Calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('days')
  @ApiOperation({
    summary: 'Дни расписания (по умолчанию 14 от сегодня, не больше 62)',
  })
  @ApiQuery({ name: 'from', required: false, example: '2026-11-13' })
  @ApiQuery({ name: 'to', required: false, example: '2026-11-26' })
  @ApiQuery({ name: 'lang', required: false, enum: ['ru', 'en', 'he'] })
  days(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Lang() lang: LangCode
  ): Promise<Day[]> {
    const [start, end] = this.calendar.resolveRange(from, to);
    return this.calendar.getDays(start, end, lang);
  }

  @Get('today')
  @ApiOperation({
    summary: 'Сегодня + 2 ближайших зажигания свечей + ближайший Шаббат',
  })
  @ApiQuery({ name: 'lang', required: false, enum: ['ru', 'en', 'he'] })
  today(@Lang() lang: LangCode): Promise<TodayInfo> {
    return this.calendar.getToday(lang);
  }

  @Get('holidays/:key')
  @ApiOperation({ summary: 'Страница праздника: описание и даты в году' })
  @ApiQuery({ name: 'year', required: false, example: 2026 })
  holiday(
    @Param('key') key: string,
    @Query('year') year: string | undefined,
    @Lang() lang: LangCode
  ): HolidayPage {
    const y = /^\d{4}$/.test(year ?? '')
      ? Number(year)
      : Number(kaliningradDate(new Date()).slice(0, 4));
    return this.calendar.getHoliday(key, lang, y);
  }
}
