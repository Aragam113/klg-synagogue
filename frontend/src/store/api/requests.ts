import { emptyApi } from '@/store/empty-api';

/** Public form endpoints (backend `requests` module). Every form → `{id}`. */
export type FormPath =
  | '/requests/prayer'
  | '/requests/excursion'
  | '/requests/appointment'
  | '/requests/rabbi-question'
  | '/requests/help'
  | '/requests/volunteer'
  | '/subscribe'
  | `/events/${string}/register`;

export interface SubmitFormArgs {
  path: FormPath;
  body: Record<string, unknown>;
  /** `Idempotency-Key`: the same key within a day returns the same `{id}`. */
  key: string;
}

/** `POST /events/:slug/register` also returns `{eventId, isPaid, seats}`. */
export interface SubmitFormResult {
  id: string;
  eventId?: string;
  isPaid?: boolean;
  seats?: number;
}

export const requestsApi = emptyApi.injectEndpoints({
  endpoints: (b) => ({
    submitForm: b.mutation<SubmitFormResult, SubmitFormArgs>({
      query: ({ path, body, key }) => ({
        url: path,
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': key },
      }),
    }),
  }),
});

export const { useSubmitFormMutation } = requestsApi;
