import { content as en } from './en/sections';
import { content as he } from './he/sections';
import { content as ru } from './ru/sections';
import type { SectionsContent } from './types';

export type { SectionsContent } from './types';
export { PHOTOS, type Photo } from './photos';

const ALL: Record<'ru' | 'en' | 'he', SectionsContent> = { ru, en, he };

/** Тексты разделов на языке интерфейса (неизвестный язык → ru). */
export const getContent = (lang: string): SectionsContent =>
  ALL[lang === 'en' || lang === 'he' ? lang : 'ru'];
