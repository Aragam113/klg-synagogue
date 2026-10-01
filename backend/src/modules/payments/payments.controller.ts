import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IdempotencyKey, PublicForm } from '@common/forms';
import { Lang } from '@common/decorators';
import type { LangCode } from '@common/localization';
import { AdminOnly } from '@modules/admin';
import {
  AdminPaymentsQueryDto,
  CreatePaymentDto,
  DedicationsQueryDto,
  PatchDedicationDto,
} from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  /** → `{paymentId, confirmUrl, accessToken}`. Лимит форм, honeypot, Idempotency-Key. */
  @Post('payments')
  @PublicForm()
  create(@Body() dto: CreatePaymentDto, @IdempotencyKey() key: string | null) {
    return this.service.create(dto, key);
  }

  /** Режим кассы: `{mode:'fake'|'real'}`. */
  @Get('payments/mode')
  mode() {
    return { mode: this.service.mode };
  }

  @Get('payments/:id')
  status(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string | undefined,
    @Lang() lang: LangCode
  ) {
    return this.service.status(id, token, lang);
  }

  /** Только PAYMENT_MODE=fake: кнопки тестовой страницы оплаты. */
  @Post('payments/fake/:id/pay')
  @HttpCode(200)
  fakePay(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token?: string
  ) {
    return this.service.fakeAction(id, token, 'pay');
  }

  @Post('payments/fake/:id/cancel')
  @HttpCode(200)
  fakeCancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token?: string
  ) {
    return this.service.fakeAction(id, token, 'cancel');
  }

  @Post('recurring/:id/cancel')
  @HttpCode(200)
  cancelRecurring(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token?: string
  ) {
    return this.service.cancelRecurring(id, token);
  }

  /** Лента одобренных посвящений: `[{id, name|null, anonymous, text, date}]`. */
  @Get('dedications')
  dedications(@Query() q: DedicationsQueryDto) {
    return this.service.dedications(q.limit);
  }
}

@ApiTags('admin: payments')
@Controller('admin')
@AdminOnly()
export class PaymentsAdminController {
  constructor(private readonly service: PaymentsService) {}

  /** → `{items, total, page, limit}`, новые сверху. */
  @Get('payments')
  list(@Query() q: AdminPaymentsQueryDto) {
    return this.service.adminList(q);
  }

  @Get('recurring')
  recurring() {
    return this.service.adminRecurring();
  }

  @Patch('payments/:id/dedication')
  dedication(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchDedicationDto
  ) {
    return this.service.setDedicationVisible(id, dto.visible);
  }
}
