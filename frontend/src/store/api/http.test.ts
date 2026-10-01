import { asApiError, isAdminUrl, toApiError, unwrapData, withLang } from '@/store/api/http';

describe('unwrapData', () => {
  it('unwraps the {success,data} envelope', () => {
    expect(unwrapData({ success: true, data: { id: 1 }, message: 'ok' })).toEqual({ id: 1 });
  });
  it('leaves other bodies as is', () => {
    expect(unwrapData([1, 2])).toEqual([1, 2]);
  });
});

describe('toApiError', () => {
  it('keeps backend message and machine field keys', () => {
    const err = toApiError({
      status: 400,
      data: {
        success: false,
        statusCode: 400,
        message: 'Bad',
        fields: { email: 'email', date: 'date_closed' },
      },
    });
    expect(err).toEqual({
      status: 400,
      message: 'Bad',
      fields: { email: 'email', date: 'date_closed' },
    });
  });
  it('turns fetch failure into a network error', () => {
    expect(toApiError({ status: 'FETCH_ERROR', error: 'TypeError' }).status).toBe('network');
  });
  it('429 without body is still a numeric status', () => {
    expect(toApiError({ status: 429, data: null }).status).toBe(429);
  });
});

describe('asApiError', () => {
  it('is undefined for no error', () => {
    expect(asApiError(undefined)).toBeUndefined();
  });
});

describe('withLang', () => {
  it('adds lang to string urls', () => {
    expect(withLang('/news?page=2', 'he')).toEqual({
      url: '/news',
      params: { page: '2', lang: 'he' },
    });
  });
  it('keeps an explicit ?lang= in a string url', () => {
    expect(withLang('/x?lang=en', 'ru')).toEqual({ url: '/x', params: { lang: 'en' } });
  });
  it('adds lang to fetch args without overriding an explicit one', () => {
    expect(withLang({ url: '/events', params: { lang: 'en' } }, 'ru')).toEqual({
      url: '/events',
      params: { lang: 'en' },
    });
    expect(withLang({ url: '/subscribe', method: 'POST', body: {} }, 'ru')).toEqual({
      url: '/subscribe',
      method: 'POST',
      body: {},
      params: { lang: 'ru' },
    });
  });
});

describe('isAdminUrl', () => {
  it('matches /admin paths only', () => {
    expect(isAdminUrl('/admin/news')).toBe(true);
    expect(isAdminUrl({ url: 'admin/requests' })).toBe(true);
    expect(isAdminUrl('/news')).toBe(false);
  });
});
