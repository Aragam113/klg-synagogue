import type { FetchArgs } from '@reduxjs/toolkit/query/react';

import { isAdminUrl } from './http';

/**
 * Потеря авторизации админки — одна точка. Сюда сообщают о каждом ответе `/admin/*`:
 * baseQuery (все запросы RTK Query) и скачивание CSV. 401 (кроме самого логина) будит
 * подписчиков — AdminGate выходит на логин с `expired=1`.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export const onAdminAuthLost = (cb: Listener): (() => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

const isLogin = (args: string | FetchArgs) =>
  /^\/?admin\/login(\/|$|\?)/.test(typeof args === 'string' ? args : args.url);

export const reportAdminResponse = (args: string | FetchArgs, status: unknown): void => {
  if (status !== 401 || !isAdminUrl(args) || isLogin(args)) return;
  for (const cb of [...listeners]) cb();
};
