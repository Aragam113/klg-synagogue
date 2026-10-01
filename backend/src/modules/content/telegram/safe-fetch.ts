/**
 * Загрузка из интернета для импорта Telegram: только https, только хосты из allowlist
 * (точное совпадение или поддомен точного суффикса), редиректы вручную — каждый адрес
 * из Location проверяется тем же allowlist, не больше MAX_REDIRECTS переходов; общий
 * таймаут и лимит размера тела.
 *
 * Проверка DNS на приватные адреса не нужна: разрешены только домены Telegram
 * (t.me, telesco.pe, cdnN.telegram.org) и r.jina.ai, которыми управляют их владельцы,
 * а IP-литералы, localhost и любые другие имена не проходят allowlist ни на первом
 * шаге, ни после редиректа.
 */

export const MAX_REDIRECTS = 3;

export type HostRule = (host: string) => boolean;

const suffix = (host: string, domain: string) =>
  host === domain || host.endsWith(`.${domain}`);

/** Картинки: CDN Telegram. */
export const TELEGRAM_CDN: HostRule = (h) =>
  suffix(h, 'telesco.pe') ||
  /^cdn\d*\.telegram\.org$/.test(h) ||
  suffix(h, 't.me');

/** Страницы канала: t.me и зеркало r.jina.ai. */
export const TELEGRAM_PAGES: HostRule = (h) =>
  h === 't.me' || h === 'r.jina.ai';

/** Адрес разрешён: https и хост (нижний регистр, без точки в конце) проходит правило. */
export function allowedUrl(url: string, rule: HostRule): URL | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (u.protocol !== 'https:' || u.username || u.password || !rule(host))
    return null;
  return u;
}

/** Отказ без смысла повторять: чужой адрес, редирект наружу, слишком большое тело. */
export class FetchRejected extends Error {}

/** Ответ не 2xx (status) или сетевая ошибка (status = -1) — можно повторить при 5xx/-1. */
export class FetchFailed extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

export interface SafeFetchOptions {
  allow: HostRule;
  timeoutMs: number;
  maxBytes: number;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

async function readLimited(res: Response, max: number): Promise<Buffer> {
  const declared = Number(res.headers.get('content-length'));
  if (declared > max) {
    await res.body?.cancel();
    throw new FetchRejected(`ответ больше ${max} байт`);
  }
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new FetchRejected(`ответ больше ${max} байт`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function safeFetch(
  url: string,
  opts: SafeFetchOptions
): Promise<Buffer> {
  const doFetch = opts.fetchImpl ?? fetch;
  const signal = AbortSignal.timeout(opts.timeoutMs);
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const target = allowedUrl(current, opts.allow);
    if (!target) throw new FetchRejected(`адрес не разрешён: ${current}`);
    let res: Response;
    try {
      res = await doFetch(target.toString(), {
        headers: opts.headers,
        redirect: 'manual',
        signal,
      });
    } catch {
      throw new FetchFailed(-1);
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      await res.body?.cancel();
      if (!location) throw new FetchFailed(res.status);
      current = new URL(location, target).toString();
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new FetchFailed(res.status);
    }
    return readLimited(res, opts.maxBytes);
  }
  throw new FetchRejected(`больше ${MAX_REDIRECTS} переходов: ${url}`);
}
