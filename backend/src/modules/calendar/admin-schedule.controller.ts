import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '@modules/admin';
import { CalendarService, parseDateParam } from './calendar.service';
import { ScheduleOverrideDto, ScheduleTemplateDto } from './dto/schedule.dto';
import { ScheduleOverrideEntity, ScheduleTemplateEntity } from './entities';

@ApiTags('Admin / Schedule')
@AdminOnly()
@Controller('admin/schedule')
export class AdminScheduleController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('template')
  @ApiOperation({ summary: 'Недельный шаблон времени молитв' })
  getTemplate(): Promise<ScheduleTemplateEntity> {
    return this.calendar.getTemplate();
  }

  @Put('template')
  @ApiOperation({ summary: 'Заменить недельный шаблон' })
  putTemplate(
    @Body() dto: ScheduleTemplateDto
  ): Promise<ScheduleTemplateEntity> {
    return this.calendar.putTemplate(dto);
  }

  @Get('overrides')
  @ApiOperation({
    summary: 'Исключения в диапазоне (по умолчанию 14 дней от сегодня)',
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  listOverrides(
    @Query('from') from?: string,
    @Query('to') to?: string
  ): Promise<ScheduleOverrideEntity[]> {
    const [start, end] = this.calendar.resolveRange(from, to);
    return this.calendar.listOverrides(start, end);
  }

  @Get('overrides/:date')
  getOverride(@Param('date') date: string): Promise<ScheduleOverrideEntity> {
    return this.calendar.getOverride(parseDateParam(date));
  }

  @Put('overrides/:date')
  @ApiOperation({ summary: 'Задать исключение на дату (null — службы нет)' })
  putOverride(
    @Param('date') date: string,
    @Body() dto: ScheduleOverrideDto
  ): Promise<ScheduleOverrideEntity> {
    return this.calendar.putOverride({
      date: parseDateParam(date),
      shacharit: dto.shacharit,
      mincha: dto.mincha,
      maariv: dto.maariv,
      note: dto.note ?? null,
    });
  }

  @Delete('overrides/:date')
  @HttpCode(200)
  async deleteOverride(@Param('date') date: string): Promise<{ date: string }> {
    await this.calendar.deleteOverride(parseDateParam(date));
    return { date };
  }
}
