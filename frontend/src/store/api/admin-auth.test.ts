import { onAdminAuthLost, reportAdminResponse } from './admin-auth';

describe('admin-auth: потеря авторизации — одна точка для всех ответов /admin/*', () => {
  it('401 от админ-эндпоинта (запрос RTK или CSV) будит подписчика; 401 логина, 4xx/5xx и публичный 401 — нет', () => {
    const lost = jest.fn();
    const off = onAdminAuthLost(lost);
    reportAdminResponse('/admin/news', 401);
    reportAdminResponse({ url: '/admin/subscribers.csv' }, 401);
    expect(lost).toHaveBeenCalledTimes(2);
    reportAdminResponse('/admin/login', 401);
    reportAdminResponse('/admin/news', 400);
    reportAdminResponse('/admin/news', 500);
    reportAdminResponse('/news', 401);
    expect(lost).toHaveBeenCalledTimes(2);
    off();
    reportAdminResponse('/admin/news', 401);
    expect(lost).toHaveBeenCalledTimes(2);
  });
});
