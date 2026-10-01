import type { HolidayPage } from '@/store/api/calendar';
import type { ApiError } from '@/store/api/http';

export type HolidayState = 'loading' | 'ready' | 'not_found' | 'error';

/** Состояние страницы праздника по ответу API (404 — праздника нет в справочнике). */
export function holidayState(data: HolidayPage | undefined, error: ApiError | null): HolidayState {
  if (data) return 'ready';
  if (error) return error.status === 404 ? 'not_found' : 'error';
  return 'loading';
}

/** Props of the /holidays/[key] view (filled by model-view). */
export interface HolidayViewProps {
  state: HolidayState;
  holiday: HolidayPage | undefined;
  error: ApiError | null;
  onRetry: () => void;
}
