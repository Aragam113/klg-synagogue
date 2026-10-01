import type { ApiError } from '@/store/api/http';

/** Banner above the form: `network` → «Не удалось отправить, попробуйте ещё раз». */
export type Banner = 'network' | 'fields' | 'too_many' | 'server' | 'request' | 'demo';

export interface Outcome {
  banner: Banner;
  /** field → machine key (`required`, `date_closed`, `seats_left:2`…), translated via `forms:errors.*`. */
  fields: Record<string, string>;
}

/** Trim strings; drop empty strings/null/undefined so optional fields stay absent. */
export function cleanPayload(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') {
      const t = v.trim();
      if (t) out[k] = t;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * Idempotency key for the next send: the previous key is reused until a send succeeds
 * (a retry after a network error must not create a duplicate), then a fresh one is issued.
 */
export function nextAttempt(
  prev: { key: string; sent: boolean } | null,
  generate: () => string
): string {
  if (prev && !prev.sent) return prev.key;
  return generate();
}

export function newKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function outcomeOf(error: ApiError): Outcome {
  if (error.status === 'network') return { banner: 'network', fields: {} };
  if (error.status === 'demo') return { banner: 'demo', fields: {} };
  if (error.fields && Object.keys(error.fields).length)
    return { banner: 'fields', fields: error.fields };
  if (error.status === 429) return { banner: 'too_many', fields: {} };
  if (typeof error.status === 'number' && error.status >= 500)
    return { banner: 'server', fields: {} };
  return { banner: 'request', fields: {} };
}
