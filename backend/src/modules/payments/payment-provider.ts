/** DI-токен кассы. В e2e можно подменить: `overrideProvider(PAYMENT_PROVIDER)`. */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export type PaymentMode = 'fake' | 'real';

export interface CreatePaymentInput {
  paymentId: string;
  accessToken: string;
  amountRub: number;
  description: string;
}

export interface CreatePaymentResult {
  /** id платежа на стороне кассы — по нему приходят уведомления. */
  providerPaymentId: string;
  /** Куда отправить посетителя для оплаты (для fake — страница сайта `/dev-pay/:id`). */
  confirmUrl: string;
}

export type ProviderStatus = 'pending' | 'paid' | 'canceled' | 'failed';

/** Касса за интерфейсом PaymentProvider (fake | real). Итог оплаты — только через PaymentsService.applyNotification. */
export interface PaymentProvider {
  readonly mode: PaymentMode;
  /** Повтор с тем же paymentId даёт тот же результат (повтор запроса по Idempotency-Key). */
  create(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getStatus(providerPaymentId: string): Promise<ProviderStatus>;
}

/**
 * Тестовая касса: ссылка ведёт на страницу фронта `/dev-pay/:id?token=…`, её кнопки
 * вызывают `POST /payments/fake/:id/{pay|cancel}`, а те — общий обработчик уведомлений.
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly mode = 'fake' as const;

  async create(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      providerPaymentId: `fake-${input.paymentId}`,
      confirmUrl: `/dev-pay/${input.paymentId}?token=${encodeURIComponent(input.accessToken)}`,
    };
  }

  async getStatus(): Promise<ProviderStatus> {
    return 'pending';
  }
}

export const REAL_PROVIDER_MISSING =
  'Реальная касса не подключена: задайте PAYMENT_MODE=fake (по умолчанию) или реализуйте RealPaymentProvider (PAYMENT_SHOP_ID, PAYMENT_SECRET_KEY)';

/**
 * Заготовка адаптера настоящей кассы.
 * TODO: выбрать эквайринг, реализовать create/getStatus, принять подписанные
 * уведомления в контроллере и провести их через PaymentsService.applyNotification.
 */
export class RealPaymentProvider implements PaymentProvider {
  readonly mode = 'real' as const;

  constructor(
    readonly shopId = process.env.PAYMENT_SHOP_ID ?? '',
    readonly secretKey = process.env.PAYMENT_SECRET_KEY ?? ''
  ) {
    throw new Error(REAL_PROVIDER_MISSING);
  }

  create(): Promise<CreatePaymentResult> {
    throw new Error(REAL_PROVIDER_MISSING);
  }

  getStatus(): Promise<ProviderStatus> {
    throw new Error(REAL_PROVIDER_MISSING);
  }
}

/** PAYMENT_MODE → касса; всё, кроме fake, роняет старт с понятной ошибкой. */
export function createPaymentProvider(
  mode = process.env.PAYMENT_MODE
): PaymentProvider {
  const m = (mode ?? 'fake').trim().toLowerCase() || 'fake';
  if (m === 'fake') return new FakePaymentProvider();
  if (m === 'real') return new RealPaymentProvider();
  throw new Error(`PAYMENT_MODE=${m}: ${REAL_PROVIDER_MISSING}`);
}
