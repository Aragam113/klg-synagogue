import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import {
  FormsThrottlerGuard,
  HoneypotGuard,
  IdempotencyKey,
  PublicForm,
} from '@common/forms';
import {
  AppointmentRequestDto,
  EventRegistrationDto,
  ExcursionRequestDto,
  HelpRequestDto,
  PrayerRequestDto,
  RabbiQuestionDto,
  SubscribeDto,
  VolunteerRequestDto,
} from './dto/request-forms.dto';
import { RequestsService } from './requests.service';

/** Публичные формы. Все → `{id}`; общий лимит, honeypot, Idempotency-Key — из @PublicForm. */
@ApiTags('requests')
@Controller()
@PublicForm()
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @Post('requests/prayer')
  prayer(@Body() dto: PrayerRequestDto, @IdempotencyKey() key: string | null) {
    return this.service.createPrayer(dto, key);
  }

  @Post('requests/excursion')
  excursion(
    @Body() dto: ExcursionRequestDto,
    @IdempotencyKey() key: string | null
  ) {
    return this.service.createExcursion(dto, key);
  }

  @Post('requests/appointment')
  appointment(
    @Body() dto: AppointmentRequestDto,
    @IdempotencyKey() key: string | null
  ) {
    return this.service.createAppointment(dto, key);
  }

  @Post('requests/rabbi-question')
  rabbiQuestion(
    @Body() dto: RabbiQuestionDto,
    @IdempotencyKey() key: string | null
  ) {
    return this.service.createRabbiQuestion(dto, key);
  }

  @Post('requests/help')
  help(@Body() dto: HelpRequestDto, @IdempotencyKey() key: string | null) {
    return this.service.createHelp(dto, key);
  }

  @Post('requests/volunteer')
  volunteer(
    @Body() dto: VolunteerRequestDto,
    @IdempotencyKey() key: string | null
  ) {
    return this.service.createVolunteer(dto, key);
  }

  /** → `{id, eventId, isPaid, seats}`; платное событие: статус new, payment_id null (оплату создаёт модуль payments). */
  @Post('events/:slug/register')
  register(
    @Param('slug') slug: string,
    @Body() dto: EventRegistrationDto,
    @IdempotencyKey() key: string | null
  ) {
    return this.service.register(slug, dto, key);
  }
}

/**
 * Подписка: тот же лимит и honeypot, что у форм, но без Idempotency-Key
 * (повтор email и так даёт тот же ответ) — поэтому без @PublicForm и его заголовка в Swagger.
 */
@ApiTags('requests')
@Controller()
@UseGuards(FormsThrottlerGuard, HoneypotGuard)
@ApiTooManyRequestsResponse({ description: 'Больше 10 отправок в минуту' })
export class SubscribeController {
  constructor(private readonly service: RequestsService) {}

  /** Повтор того же email → тот же ответ 200. */
  @Post('subscribe')
  @HttpCode(200)
  subscribe(@Body() dto: SubscribeDto) {
    return this.service.subscribe(dto);
  }
}
