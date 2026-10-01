import { type Paged } from '@/store/api/admin';
import type { PaymentPurpose, PaymentStatus } from '@/store/api/payments';
import { emptyApi } from '@/store/empty-api';

/** Админка: платежи, ежемесячные подписки, модерация посвящений (бэкенд — модуль payments). */
export interface AdminPayment {
  id: string;
  purpose: PaymentPurpose;
  amountRub: number;
  fundraiser: { id: string; slug: string; title: string } | null;
  donorName: string | null;
  anonymous: boolean;
  email: string | null;
  phone: string | null;
  comment: string | null;
  dedication: string | null;
  dedicationVisible: boolean;
  recurring: boolean;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
}

export interface AdminRecurring {
  id: string;
  paymentId: string;
  amountRub: number;
  email: string | null;
  status: 'active' | 'canceled';
  createdAt: string;
}

export const adminPaymentsApi = emptyApi
  .enhanceEndpoints({ addTagTypes: ['AdminPayment'] })
  .injectEndpoints({
    endpoints: (b) => ({
      adminPayments: b.query<
        Paged<AdminPayment>,
        { purpose?: string; status?: string; page?: number; limit?: number }
      >({
        query: (params) => ({
          url: '/admin/payments',
          params: {
            ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)),
          },
        }),
        providesTags: ['AdminPayment'],
      }),
      adminRecurring: b.query<AdminRecurring[], void>({
        query: () => ({ url: '/admin/recurring' }),
        providesTags: ['AdminPayment'],
      }),
      adminDedication: b.mutation<
        { id: string; dedicationVisible: boolean },
        { id: string; visible: boolean }
      >({
        query: ({ id, visible }) => ({
          url: `/admin/payments/${id}/dedication`,
          method: 'PATCH',
          body: { visible },
        }),
        invalidatesTags: ['AdminPayment', 'Payment'],
      }),
    }),
  });

export const { useAdminPaymentsQuery, useAdminRecurringQuery, useAdminDedicationMutation } =
  adminPaymentsApi;
