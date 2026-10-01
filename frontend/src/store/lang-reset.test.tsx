import i18next from 'i18next';
import { Provider } from 'react-redux';
import { act, create } from 'react-test-renderer';

import { emptyApi } from '@/store/empty-api';
import { store } from '@/store/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const api = emptyApi.injectEndpoints({
  endpoints: (b) => ({ today: b.query<string, void>({ query: () => '/calendar/today' }) }),
});

let seen: string | undefined;
const Probe = () => {
  seen = api.useTodayQuery().data;
  return null;
};

const flush = async () => {
  for (let i = 0; i < 10; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
};

it('a hook without {lang} refetches with the new ?lang= after a language switch', async () => {
  await i18next.init({ lng: 'ru', resources: {} });
  const fetchMock = jest.fn(async (req: Request) => {
    const lang = new URL(req.url).searchParams.get('lang');
    return new Response(JSON.stringify({ success: true, data: `today-${lang}`, message: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await act(async () => {
    create(
      <Provider store={store}>
        <Probe />
      </Provider>
    );
  });
  await flush();
  expect(seen).toBe('today-ru');
  await act(async () => {
    await i18next.changeLanguage('he');
  });
  await flush();
  expect(seen).toBe('today-he');
  expect((fetchMock.mock.calls.at(-1)?.[0] as Request).url).toMatch(/lang=he$/);
});
