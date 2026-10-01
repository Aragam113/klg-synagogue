import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from '@modules/content/entities/event.entity';
import { FundraiserEntity } from '@modules/content/entities/fundraiser.entity';
import { ContentModule } from '@modules/content/content.module';
import { RequestEntity } from '@modules/requests/entities/request.entity';
import { EventRegistrationEntity } from '@modules/requests/entities/event-registration.entity';
import { PaymentEntity, RecurringDonationEntity } from './entities';
import {
  PaymentsAdminController,
  PaymentsController,
} from './payments.controller';
import { PaymentsService } from './payments.service';
import { PAYMENT_PROVIDER, createPaymentProvider } from './payment-provider';

/**
 * Модуль «payments»: платежи, ежемесячные пожертвования, касса (PAYMENT_MODE=fake).
 * С content — взаимный импорт через forwardRef: отсюда SettingsService (тариф Кадиша),
 * оттуда PaymentsService (счётчик). Сущности события/сбора — через forFeature.
 */
@Module({
  imports: [
    // Тариф Кадиша — SettingsService; content сам импортирует payments ради счётчика.
    forwardRef(() => ContentModule),
    TypeOrmModule.forFeature([
      PaymentEntity,
      RecurringDonationEntity,
      FundraiserEntity,
      EventEntity,
      RequestEntity,
      EventRegistrationEntity,
    ]),
  ],
  controllers: [PaymentsController, PaymentsAdminController],
  providers: [
    PaymentsService,
    { provide: PAYMENT_PROVIDER, useFactory: () => createPaymentProvider() },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
