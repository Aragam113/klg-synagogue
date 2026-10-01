import type { ApiError } from '@/store/api/http';
import type { PaymentInfo } from '@/store/api/payments';

/** /thanks/[id]?token: payment status (polled every 3 s, ≤ 2 min), monthly cancel. */
export interface ThanksViewProps {
  payment: PaymentInfo | undefined;
  /** The checkout did not answer in 2 minutes. */
  timedOut: boolean;
  notFound: boolean;
  error: ApiError | null;
  onRetry: () => void;
  onCancelRecurring: () => void;
  canceling: boolean;
}
