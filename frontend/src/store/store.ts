import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import i18next from 'i18next';

import { emptyApi } from './empty-api';

/** Slices live in src/store/api/<module>.ts and inject into emptyApi - nothing to register here. */

export const store = configureStore({
  reducer: {
    [emptyApi.reducerPath]: emptyApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(emptyApi.middleware),
});

setupListeners(store.dispatch);

/**
 * baseQuery adds ?lang= itself, so cache keys do not contain the language. Rule: on language switch the whole API
 * cache is reset and every mounted hook refetches in the new language (hooks re-subscribe after resetApiState).
 */
i18next.on('languageChanged', () => {
  store.dispatch(emptyApi.util.resetApiState());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
