import type { Fundraiser } from '@/store/api/content';
import type { ApiError } from '@/store/api/http';

/** /donate: form, counter, active fundraisers, dedications ticker, requisites. */
export interface DonateViewProps {
  supportersCount: number | null;
  requisites: string | null | undefined;
  fundraisers: Fundraiser[];
  fundraisersError: ApiError | null;
  onRetry: () => void;
  /** Dedications ticker items (name, then text in italic). */
  dedications: { text: string; italic?: boolean }[];
  testMode: boolean;
}
