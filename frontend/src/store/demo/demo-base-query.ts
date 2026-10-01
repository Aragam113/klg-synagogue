import type { FetchArgs } from '@reduxjs/toolkit/query/react';
import i18next from 'i18next';

import { assetUrl } from '@/config/demo';
import type { ApiError } from '@/store/api/http';

import { type DemoError, demoResponse } from './demo-model';

const cache = new Map<string, Promise<unknown>>();

/** Snapshot file from `public/demo-data/` (fetched once per session). */
const load = (file: string): Promise<unknown> => {
  let p = cache.get(file);
  if (!p) {
    p = fetch(assetUrl(`/demo-data/${file}`)).then((r) => {
      if (!r.ok) throw new Error(`demo-data ${file}: ${r.status}`);
      return r.json();
    });
    p.catch(() => cache.delete(file));
    cache.set(file, p);
  }
  return p;
};

const MESSAGE: Record<DemoError, string> = {
  forms_disabled: 'demo.formsDisabled',
  calendar_stale: 'demo.calendarStale',
  not_found: 'errors.request',
};

/** baseQuery of the demo build: the request (with `params.lang` already set) is answered from the snapshot. */
export async function demoBaseQuery(
  req: FetchArgs
): Promise<{ data: unknown } | { error: ApiError }> {
  const res = await demoResponse(
    { url: req.url, method: req.method, params: req.params },
    load,
    new Date()
  );
  if ('data' in res) return { data: res.data };
  const message = i18next.t(MESSAGE[res.error], { ns: 'common' });
  return {
    error: res.error === 'not_found' ? { status: 404, message } : { status: 'demo', message },
  };
}
