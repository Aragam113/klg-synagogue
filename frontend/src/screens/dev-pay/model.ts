import type { ApiError } from '@/store/api/http';
import type { PaymentInfo } from '@/store/api/payments';

/** /dev-pay/[id]?token: test checkout «Тестовая оплата: Оплатить / Отменить». */
export interface DevPayViewProps {
  payment: PaymentInfo | undefined;
  notFound: boolean;
  error: ApiError | null;
  onRetry: () => void;
  busy: boolean;
  onAction: (action: 'pay' | 'cancel') => void;
  thanksHref: string;
}

/** Result page of a payment: `/thanks/<id>?token=…`. */
export const thanksHref = (id: string, token: string) =>
  `/thanks/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`;
