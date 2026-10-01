import type { Program } from '@/store/api/content';
import type { ApiError } from '@/store/api/http';

/** Программы общины: название, для кого, когда, контакт. */
export interface ProgramsViewProps {
  programs: Program[];
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}
