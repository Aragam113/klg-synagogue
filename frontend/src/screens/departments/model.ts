import type { Department } from '@/store/api/content';
import type { ApiError } from '@/store/api/http';

/** Подразделения и услуги: адрес, телефон, часы, описание. */
export interface DepartmentsViewProps {
  departments: Department[];
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}

/** Телефон → `tel:` без пробелов, скобок и дефисов. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
