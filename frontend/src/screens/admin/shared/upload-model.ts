/** Лимиты `POST /admin/uploads` (бэк: content/uploads/image.ts) — проверяются до отправки. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Ключ ошибки файла (как у бэка в `fields.file`) или undefined, если файл можно отправлять. */
export const uploadError = (file: {
  size: number;
  type: string;
}): 'too_large' | 'unsupported_type' | undefined => {
  if (!(UPLOAD_TYPES as readonly string[]).includes(file.type)) return 'unsupported_type';
  if (file.size > MAX_UPLOAD_BYTES) return 'too_large';
  return undefined;
};
