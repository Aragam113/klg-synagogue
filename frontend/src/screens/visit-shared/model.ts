/** Общие чистые хелперы моделей статических разделов. */

/** Порядковый номер карточки: 0 → «01». */
export const num = (i: number) => String(i + 1).padStart(2, '0');

/** Диапазон сеансов «11:00–19:00» из списка времён. */
export const slotRange = (slots: readonly string[]) =>
  slots.length ? `${slots[0]}–${slots[slots.length - 1]}` : '';
