import type { Fundraiser } from '@/store/api/content';
import type { ApiError } from '@/store/api/http';

/** /fundraisers/[slug]: goal, raised, %, supporters, text, donation into this fundraiser. */
export interface FundraiserViewProps {
  fundraiser: Fundraiser | undefined;
  notFound: boolean;
  error: ApiError | null;
  onRetry: () => void;
  requisites: string | null | undefined;
}
