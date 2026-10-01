import { emptyApi } from '@/store/empty-api';

/** `POST /payments` → куда вести посетителя (fake: `/dev-pay/:id?token=…`). */
export type PaymentStatus = 'pending' | 'paid' | 'canceled' | 'failed';
export type PaymentPurpose = 'donation' | 'prayer' | 'event';

export interface CreatedPayment {
  paymentId: string;
  confirmUrl: string;
  accessToken: string;
}

/** `GET /payments/:id?token` — экран «Спасибо» и тестовая касса. */
export interface PaymentInfo {
  id: string;
  status: PaymentStatus;
  purpose: PaymentPurpose;
  amountRub: number;
  recurring: boolean;
  anonymous: boolean;
  donorName: string | null;
  createdAt: string;
  paidAt: string | null;
  fundraiser: { slug: string; title: string } | null;
  event: { slug: string; title: string } | null;
  subscription: { id: string; status: 'active' | 'canceled'; cancelToken: string } | null;
}

/** Лента одобренных посвящений (`GET /dedications`). */
export interface Dedication {
  id: string;
  name: string | null;
  anonymous: boolean;
  text: string;
  date: string;
}

type Ref = { id: string; token: string };

export const paymentsApi = emptyApi.injectEndpoints({
  endpoints: (b) => ({
    createPayment: b.mutation<CreatedPayment, { body: Record<string, unknown>; key: string }>({
      query: ({ body, key }) => ({
        url: '/payments',
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': key },
      }),
    }),
    getPayment: b.query<PaymentInfo, Ref>({
      query: ({ id, token }) => ({ url: `/payments/${id}`, params: { token } }),
    }),
    getPaymentMode: b.query<{ mode: 'fake' | 'real' }, void>({
      query: () => '/payments/mode',
    }),
    fakePayment: b.mutation<
      { id: string; status: PaymentStatus },
      Ref & { action: 'pay' | 'cancel' }
    >({
      query: ({ id, token, action }) => ({
        url: `/payments/fake/${id}/${action}`,
        method: 'POST',
        params: { token },
      }),
    }),
    cancelRecurring: b.mutation<{ id: string; status: 'canceled' }, Ref>({
      query: ({ id, token }) => ({
        url: `/recurring/${id}/cancel`,
        method: 'POST',
        params: { token },
      }),
    }),
    getDedications: b.query<Dedication[], { limit?: number } | void>({
      query: (a) => ({ url: '/dedications', params: { limit: a?.limit ?? 20 } }),
    }),
  }),
});

export const {
  useCreatePaymentMutation,
  useGetPaymentQuery,
  useGetPaymentModeQuery,
  useFakePaymentMutation,
  useCancelRecurringMutation,
  useGetDedicationsQuery,
} = paymentsApi;
