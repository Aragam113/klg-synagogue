import type { RequestStatus, RequestType } from '@/store/api/admin-requests';

export const REQUEST_TYPES: RequestType[] = [
  'prayer',
  'excursion',
  'appointment',
  'rabbi_question',
  'help',
  'volunteer',
];
export const REQUEST_STATUSES: RequestStatus[] = ['new', 'in_progress', 'done', 'rejected'];

/** Единый список заявок с фильтром по типу и статусу, карточка, заметка. */
export interface RequestFilters {
  type: string;
  status: string;
  page: number;
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export const requestFilters = (
  q: Record<string, string | string[] | undefined>
): RequestFilters => {
  const type = one(q.type);
  const status = one(q.status);
  const page = Number(one(q.page));
  return {
    type: (REQUEST_TYPES as string[]).includes(type) ? type : '',
    status: (REQUEST_STATUSES as string[]).includes(status) ? status : '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
};

const text = (v: unknown): string | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 'да' : 'нет';
  if (Array.isArray(v)) {
    const parts = v.map(text).filter((x): x is string => !!x);
    return parts.length ? parts.join(', ') : null;
  }
  return String(v);
};

/** payload заявки → пары [ключ, текст] для карточки (вложенные объекты — 'a.b'). */
export const payloadEntries = (payload: unknown, prefix = ''): [string, string][] => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...payloadEntries(v, key));
    else {
      const s = text(v);
      if (s !== null) out.push([key, s]);
    }
  }
  return out;
};
