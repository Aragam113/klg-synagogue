import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminOnly } from '@modules/admin';
import {
  AdminRequestsQueryDto,
  PatchRegistrationDto,
  PatchRequestDto,
  YahrzeitsQueryDto,
} from './dto/admin-requests.dto';
import { RequestsService } from './requests.service';
import { toCsv } from './csv';

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

@ApiTags('admin: requests')
@Controller('admin')
@AdminOnly()
export class RequestsAdminController {
  constructor(private readonly service: RequestsService) {}

  /** → `{items: Request[], total, page, limit}`, новые сверху. */
  @Get('requests')
  list(@Query() q: AdminRequestsQueryDto) {
    return this.service.list(q);
  }

  /** → заявка + `reminder` (йорцайт) или null. */
  @Get('requests/:id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Patch('requests/:id')
  patch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PatchRequestDto) {
    return this.service.patch(id, dto);
  }

  @Get('subscribers')
  subscribers() {
    return this.service.listSubscribers();
  }

  @Get('subscribers.csv')
  async subscribersCsv(@Res() res: Response) {
    const rows = await this.service.listSubscribers();
    sendCsv(
      res,
      'subscribers.csv',
      toCsv(rows, [
        ['Имя', (r) => r.name],
        ['Email', (r) => r.email],
        ['Живёт в Калининграде', (r) => (r.livesInCity ? 'да' : 'нет')],
        ['Дата', (r) => r.createdAt.toISOString()],
      ])
    );
  }

  @Get('events/:id/registrations')
  registrations(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.eventRegistrations(id);
  }

  @Get('events/:id/registrations.csv')
  async registrationsCsv(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response
  ) {
    const rows = await this.service.eventRegistrations(id);
    sendCsv(
      res,
      `registrations-${id}.csv`,
      toCsv(rows, [
        ['Имя', (r) => r.name],
        ['Телефон', (r) => r.phone],
        ['Email', (r) => r.email ?? ''],
        ['Мест', (r) => String(r.seats)],
        ['Статус', (r) => r.status],
        ['Оплата', (r) => r.paymentId ?? ''],
        ['Дата', (r) => r.createdAt.toISOString()],
      ])
    );
  }

  @Patch('registrations/:id')
  patchRegistration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchRegistrationDto
  ) {
    return this.service.patchRegistration(id, dto);
  }

  /** → `UpcomingYahrzeit[]` на `days` (по умолчанию 30) дней вперёд. */
  @Get('yahrzeits')
  yahrzeits(@Query() q: YahrzeitsQueryDto) {
    return this.service.upcomingYahrzeits(q.days ?? 30);
  }
}
