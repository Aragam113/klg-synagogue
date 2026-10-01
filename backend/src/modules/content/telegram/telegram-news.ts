import { kaliningradDate } from '../../calendar/kaliningrad-time';
import type { TgPost } from './telegram-parser';

/** Пост канала → черновик новости сайта (до скачивания картинок). */
export interface NewsDraft {
  sourceUrl: string;
  publishedAt: Date;
  title: string;
  lead: string | null;
  /** Полный текст поста дословно + служебные пометки (видео, аудио, репост). */
  body: string;
  /**
   * Картинки по постам-источникам: сначала сам пост, затем приклеенные к нему посты
   * только с фото. Первая картинка станет обложкой.
   */
  parts: PhotoPart[];
}

/** Картинки одного поста Telegram (адреса CDN по порядку). */
export interface PhotoPart {
  sourceUrl: string;
  imageUrls: string[];
}

/** Пост только с фото, которому не нашлось поста с текстом того же дня в выборке. */
export interface OrphanPhotoPost extends PhotoPart {
  publishedAt: Date;
}

export const TITLE_MAX = 120;
const LEAD_MAX = 300;

/** Срезает эмодзи, пробелы и прочие не-буквы по краям строки. */
export function trimDecor(line: string): string {
  return line
    .replace(/^[^\p{L}\p{N}«"„(]+/u, '')
    .replace(/[^\p{L}\p{N}»"“)!?.…]+$/u, '')
    .trim();
}

function cut(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max - 1);
  const space = head.lastIndexOf(' ');
  return `${(space > max / 2 ? head.slice(0, space) : head).replace(/[\s,;:—-]+$/u, '')}…`;
}

/** Подпись канала под постом: «💬 Бейт Хабад Калининград (https://t.me/<канал>)». */
function isSignature(line: string, channel: string): boolean {
  const t = trimDecor(line);
  return t.length < 100 && t.endsWith(`(https://t.me/${channel})`);
}

const sentences = (text: string) =>
  text.split(/(?<=[.!?…])\s+/u).filter((s) => s.trim());

export function titleOf(text: string): string {
  const first = text.split('\n').map(trimDecor).find(Boolean) ?? '';
  if (first.length <= TITLE_MAX) return first;
  return cut(trimDecor(sentences(first)[0] ?? first), TITLE_MAX);
}

function leadOf(text: string, channel: string): string | null {
  const lines = text.split('\n').map(trimDecor);
  const firstIdx = lines.findIndex(Boolean);
  const rest = lines
    .slice(firstIdx + 1)
    .filter((l) => l && !isSignature(l, channel))
    .join(' ');
  const lead = sentences(rest).slice(0, 2).join(' ').trim();
  return lead ? cut(lead, LEAD_MAX) : null;
}

/** Есть ли в посте текст, кроме подписи канала и эмодзи. */
export function hasOwnText(post: TgPost, channel: string): boolean {
  return post.text
    .split('\n')
    .some((l) => !isSignature(l, channel) && /\p{L}/u.test(l));
}

function notes(post: TgPost): string[] {
  const out: string[] = [];
  if (post.forwardedFrom) {
    const { name, url } = post.forwardedFrom;
    out.push(`Репост из «${name}»${url ? ` (${url})` : ''}`);
  }
  if (post.hasVideo) out.push('Видео — в источнике');
  if (post.hasAudio) out.push('Аудио — в источнике');
  return out;
}

/**
 * Посты → новости. Пост без своего текста (только фото/видео с подписью канала)
 * приклеивается к предыдущему посту того же дня; без такого соседа в выборке —
 * уходит в `orphans` (импорт допишет его к сохранённой новости дня или залогирует).
 */
export function postsToNews(
  posts: TgPost[],
  channel: string
): { drafts: NewsDraft[]; orphans: OrphanPhotoPost[] } {
  const drafts: NewsDraft[] = [];
  const orphans: OrphanPhotoPost[] = [];
  let prev: { draft: NewsDraft; day: string } | null = null;
  for (const post of [...posts].sort((a, b) => a.id - b.id)) {
    if (!hasOwnText(post, channel)) {
      if (!post.images.length) continue;
      const part = { sourceUrl: post.url, imageUrls: [...post.images] };
      if (prev && prev.day === kaliningradDate(new Date(post.date)))
        prev.draft.parts.push(part);
      else orphans.push({ ...part, publishedAt: new Date(post.date) });
      continue;
    }
    const extra = notes(post);
    const draft: NewsDraft = {
      sourceUrl: post.url,
      publishedAt: new Date(post.date),
      title: titleOf(post.text),
      lead: leadOf(post.text, channel),
      body: extra.length ? `${post.text}\n\n${extra.join('\n')}` : post.text,
      parts: [{ sourceUrl: post.url, imageUrls: [...post.images] }],
    };
    drafts.push(draft);
    prev = { draft, day: kaliningradDate(new Date(post.date)) };
  }
  return { drafts, orphans };
}
