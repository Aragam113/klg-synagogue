import { type Paged } from '@/store/api/admin';
import { emptyApi } from '@/store/empty-api';

/** Админка: заявки, годовщины, подписчики, регистрации на события (бэкенд — модуль requests). */
export type RequestType =
  | 'prayer'
  | 'excursion'
  | 'appointment'
  | 'rabbi_question'
  | 'help'
  | 'volunteer';
export type RequestStatus = 'new' | 'in_progress' | 'done' | 'rejected';

export interface AdminRequest {
  id: string;
  type: RequestType;
  payload: Record<string, unknown>;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  status: RequestStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt?: string;
  reminder?: Record<string, unknown> | null;
}

export interface Yahrzeit {
  reminderId: string;
  requestId: string;
  deceasedName: string;
  fatherName: string | null;
  deathDate: string;
  anniversary: string;
  daysLeft: number;
  email: string | null;
  phone: string | null;
  byEmail: boolean;
  byPhone: boolean;
}

export interface Subscriber {
  id: string;
  name: string | null;
  email: string;
  livesInCity: boolean;
  createdAt: string;
}

export type RegistrationStatus = 'new' | 'confirmed' | 'canceled';
export interface Registration {
  id: string;
  eventId: string;
  name: string;
  phone: string;
  email: string;
  seats: number;
  status: RegistrationStatus;
  paymentId: string | null;
  createdAt: string;
}

export const adminRequestsApi = emptyApi
  .enhanceEndpoints({ addTagTypes: ['AdminRequest', 'AdminRegistration'] })
  .injectEndpoints({
    endpoints: (b) => ({
      adminRequests: b.query<
        Paged<AdminRequest>,
        { type?: string; status?: string; page?: number; limit?: number }
      >({
        query: (params) => ({
          url: '/admin/requests',
          params: {
            ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)),
          },
        }),
        providesTags: ['AdminRequest'],
      }),
      adminRequest: b.query<AdminRequest, string>({
        query: (id) => ({ url: `/admin/requests/${id}` }),
        providesTags: ['AdminRequest'],
      }),
      adminPatchRequest: b.mutation<
        AdminRequest,
        { id: string; status?: RequestStatus; adminNote?: string | null }
      >({
        query: ({ id, ...body }) => ({
          url: `/admin/requests/${id}`,
          method: 'PATCH',
          body,
        }),
        invalidatesTags: ['AdminRequest'],
      }),
      adminYahrzeits: b.query<Yahrzeit[], number | void>({
        query: (days) => ({ url: '/admin/yahrzeits', params: { days: days ?? 30 } }),
      }),
      adminSubscribers: b.query<Subscriber[], void>({
        query: () => ({ url: '/admin/subscribers' }),
      }),
      adminRegistrations: b.query<Registration[], string>({
        query: (eventId) => ({ url: `/admin/events/${eventId}/registrations` }),
        providesTags: ['AdminRegistration'],
      }),
      adminPatchRegistration: b.mutation<Registration, { id: string; status: RegistrationStatus }>({
        query: ({ id, status }) => ({
          url: `/admin/registrations/${id}`,
          method: 'PATCH',
          body: { status },
        }),
        invalidatesTags: ['AdminRegistration'],
      }),
    }),
  });

export const {
  useAdminRequestsQuery,
  useAdminRequestQuery,
  useAdminPatchRequestMutation,
  useAdminYahrzeitsQuery,
  useAdminSubscribersQuery,
  useAdminRegistrationsQuery,
  useAdminPatchRegistrationMutation,
} = adminRequestsApi;
