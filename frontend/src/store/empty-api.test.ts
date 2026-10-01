import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';

import { ADMIN_TOKEN_KEY } from '@/store/api/admin-token';
import { emptyApi } from '@/store/empty-api';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const api = emptyApi.injectEndpoints({
  endpoints: (b) => ({
    pub: b.query<{ id: number }, void>({ query: () => '/news' }),
    adm: b.query<unknown, void>({ query: () => '/admin/requests' }),
    bad: b.query<unknown, void>({ query: () => '/requests/prayer' }),
  }),
});
const makeStore = () =>
  configureStore({
    reducer: { [emptyApi.reducerPath]: emptyApi.reducer },
    middleware: (g) => g({ serializableCheck: false }).concat(emptyApi.middleware),
  });
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: jest.Mock;
const sent = () => fetchMock.mock.calls[0][0] as Request;

beforeEach(async () => {
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await AsyncStorage.setItem(ADMIN_TOKEN_KEY, 'tok');
});

it('public endpoint: no Bearer, ?lang added, envelope unwrapped', async () => {
  fetchMock.mockResolvedValue(json(200, { success: true, data: { id: 7 }, message: 'ok' }));
  const r = await makeStore().dispatch(api.endpoints.pub.initiate());
  expect(r.data).toEqual({ id: 7 });
  expect(sent().headers.get('Authorization')).toBeNull();
  expect(sent().url).toBe('http://localhost:3000/api/v1/news?lang=ru');
});

it('admin endpoint: Bearer from synagogue.adminToken', async () => {
  fetchMock.mockResolvedValue(json(200, { success: true, data: [], message: 'ok' }));
  await makeStore().dispatch(api.endpoints.adm.initiate());
  expect(sent().headers.get('Authorization')).toBe('Bearer tok');
});

it('backend error arrives as ApiError with field keys', async () => {
  fetchMock.mockResolvedValue(
    json(400, {
      success: false,
      statusCode: 400,
      message: 'Bad',
      error: 'Bad Request',
      fields: { email: 'email' },
    })
  );
  const r = await makeStore().dispatch(api.endpoints.bad.initiate());
  expect(r.error).toEqual({ status: 400, message: 'Bad', fields: { email: 'email' } });
});
