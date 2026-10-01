import {
  FetchRejected,
  TELEGRAM_CDN,
  TELEGRAM_PAGES,
  allowedUrl,
  safeFetch,
} from './safe-fetch';

/** Поддельный fetch: адрес → ответ; запоминает, куда реально ходили. */
const fake = (routes: Record<string, () => Response>) => {
  const calls: string[] = [];
  const impl = (async (url: string) => {
    calls.push(url);
    const r = routes[url];
    if (!r) throw new Error(`unexpected ${url}`);
    return r();
  }) as unknown as typeof fetch;
  return { impl, calls };
};
const redirect = (to: string) => () =>
  new Response(null, { status: 302, headers: { location: to } });
const ok =
  (body = 'img') =>
  () =>
    new Response(body, { status: 200 });

const opts = (impl: typeof fetch, maxBytes = 1000) => ({
  allow: TELEGRAM_CDN,
  timeoutMs: 5000,
  maxBytes,
  fetchImpl: impl,
});

describe('safeFetch — allowlist CDN Telegram', () => {
  it('allowlist: https, точные суффиксы, регистр и точка в конце', () => {
    expect(
      allowedUrl('https://cdn4.telesco.pe/f/a.jpg', TELEGRAM_CDN)
    ).not.toBeNull();
    expect(
      allowedUrl('https://CDN4.Telesco.PE./f/a.jpg', TELEGRAM_CDN)
    ).not.toBeNull();
    expect(
      allowedUrl('https://cdn1.telegram.org/x', TELEGRAM_CDN)
    ).not.toBeNull();
    expect(allowedUrl('http://cdn4.telesco.pe/a.jpg', TELEGRAM_CDN)).toBeNull();
    expect(
      allowedUrl('https://evil-telesco.pe/a.jpg', TELEGRAM_CDN)
    ).toBeNull();
    expect(
      allowedUrl('https://telesco.pe.evil.com/a.jpg', TELEGRAM_CDN)
    ).toBeNull();
    expect(allowedUrl('https://127.0.0.1/a.jpg', TELEGRAM_CDN)).toBeNull();
    expect(
      allowedUrl('https://user@cdn4.telesco.pe/a.jpg', TELEGRAM_CDN)
    ).toBeNull();
    expect(allowedUrl('https://t.me/s/chan', TELEGRAM_PAGES)).not.toBeNull();
    expect(
      allowedUrl('https://r.jina.ai/https://t.me/s/chan', TELEGRAM_PAGES)
    ).not.toBeNull();
    expect(allowedUrl('https://x.t.me/s/chan', TELEGRAM_PAGES)).toBeNull();
  });

  it('чужой хост и http отклоняются без запроса', async () => {
    const { impl, calls } = fake({});
    await expect(
      safeFetch('https://evil.example/a.jpg', opts(impl))
    ).rejects.toBeInstanceOf(FetchRejected);
    await expect(
      safeFetch('http://cdn4.telesco.pe/a.jpg', opts(impl))
    ).rejects.toBeInstanceOf(FetchRejected);
    expect(calls).toEqual([]);
  });

  it('редирект внутри CDN проходит, на чужой хост — отклоняется до запроса туда', async () => {
    const good = fake({
      'https://cdn4.telesco.pe/a.jpg': redirect(
        'https://cdn5.telesco.pe/b.jpg'
      ),
      'https://cdn5.telesco.pe/b.jpg': ok('IMG'),
    });
    expect(
      (
        await safeFetch('https://cdn4.telesco.pe/a.jpg', opts(good.impl))
      ).toString()
    ).toBe('IMG');
    const bad = fake({
      'https://cdn4.telesco.pe/a.jpg': redirect(
        'http://169.254.169.254/latest'
      ),
    });
    await expect(
      safeFetch('https://cdn4.telesco.pe/a.jpg', opts(bad.impl))
    ).rejects.toBeInstanceOf(FetchRejected);
    expect(bad.calls).toEqual(['https://cdn4.telesco.pe/a.jpg']);
  });

  it('больше трёх переходов — отказ', async () => {
    const loop = fake({
      'https://cdn4.telesco.pe/1': redirect('/2'),
      'https://cdn4.telesco.pe/2': redirect('/3'),
      'https://cdn4.telesco.pe/3': redirect('/4'),
      'https://cdn4.telesco.pe/4': redirect('/5'),
    });
    await expect(
      safeFetch('https://cdn4.telesco.pe/1', opts(loop.impl))
    ).rejects.toBeInstanceOf(FetchRejected);
    expect(loop.calls).toHaveLength(4);
  });

  it('тело больше лимита: по content-length и по потоку', async () => {
    const declared = fake({
      'https://cdn4.telesco.pe/a': () =>
        new Response('x', {
          status: 200,
          headers: { 'content-length': '5000' },
        }),
    });
    await expect(
      safeFetch('https://cdn4.telesco.pe/a', opts(declared.impl))
    ).rejects.toThrow(/больше 1000 байт/);
    const streamed = fake({
      'https://cdn4.telesco.pe/a': ok('y'.repeat(1500)),
    });
    await expect(
      safeFetch('https://cdn4.telesco.pe/a', opts(streamed.impl))
    ).rejects.toThrow(/больше 1000 байт/);
  });
});
