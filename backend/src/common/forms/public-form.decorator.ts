import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { FormsThrottlerGuard } from './forms-throttler.guard';
import { HoneypotGuard } from './honeypot.guard';
import { IDEMPOTENCY_HEADER } from './idempotency';

/**
 * Публичная форма (POST): общий лимит FORMS_RATE_LIMIT (10) отправок в минуту с IP
 * на все формы разом → 429; honeypot-поле `website` (непустое → 400 без подробностей).
 * Лимит считается до honeypot, так что боты тоже его расходуют.
 */
export function PublicForm(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(FormsThrottlerGuard, HoneypotGuard),
    ApiHeader({
      name: IDEMPOTENCY_HEADER,
      required: false,
      description: 'Клиентский ключ: повтор с тем же ключом не создаёт дубль',
    }),
    ApiTooManyRequestsResponse({ description: 'Больше 10 отправок в минуту' })
  );
}
