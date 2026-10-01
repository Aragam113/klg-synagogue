import { uploadError } from './upload-model';

describe('upload-model: проверка файла до отправки (лимиты бэка: ≤ 10 МБ, JPEG/PNG/WebP)', () => {
  const MB = 1024 * 1024;

  it('файл больше 10 МБ — too_large, ровно 10 МБ — можно', () => {
    expect(uploadError({ size: 10 * MB + 1, type: 'image/jpeg' })).toBe('too_large');
    expect(uploadError({ size: 10 * MB, type: 'image/jpeg' })).toBeUndefined();
  });

  it('не JPEG/PNG/WebP — unsupported_type', () => {
    expect(uploadError({ size: 1000, type: 'image/gif' })).toBe('unsupported_type');
    expect(uploadError({ size: 1000, type: 'image/png' })).toBeUndefined();
    expect(uploadError({ size: 1000, type: 'image/webp' })).toBeUndefined();
  });
});
