/**
 * Разбор публичной веб-версии канала `https://t.me/s/<канал>` (без API и логина).
 * Одно сообщение веб-версии = один пост; альбом (группа медиа) уже собран в нём.
 * Только регулярки: HTML Telegram стабилен и плоский, парсер DOM не нужен.
 */

export interface TgForward {
  name: string;
  url: string | null;
}

export interface TgPost {
  id: number;
  /** Ссылка на пост: https://t.me/<канал>/<id> */
  url: string;
  /** ISO-время публикации, как в `<time datetime>`. */
  date: string;
  /** Текст поста: переносы строк, эмодзи; ссылка с текстом → «текст (адрес)». */
  text: string;
  /** Картинки поста по порядку раскладки (фото и превью видео). */
  images: string[];
  hasVideo: boolean;
  hasAudio: boolean;
  forwardedFrom: TgForward | null;
}

export interface TgPage {
  posts: TgPost[];
  /** id для `?before=` следующей (более старой) страницы; null — дальше нет. */
  before: number | null;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Содержимое первого `<div>`, открытого на позиции `start` (с учётом вложенных div). */
function innerDiv(html: string, start: number): string {
  const open = html.indexOf('>', start) + 1;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = open;
  let depth = 1;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) return html.slice(open, m.index);
  }
  return html.slice(open);
}

/** Символ из области частного использования Unicode — в тексте Telegram не встречается. */
const MARK = String.fromCharCode(0xe000);
const MARKED = new RegExp(`${MARK}(\\d+)${MARK}`, 'g');

/** HTML текста поста → обычный текст. Сущности декодируются ровно один раз, после снятия тегов. */
export function htmlToText(html: string): string {
  // Ссылка → «текст (адрес)»: её части декодируются отдельно, а в тексте остаётся
  // маркер MARK+N+MARK, который подставляется уже после общего декодирования.
  const links: string[] = [];
  const s = html
    // вложенная копия блока текста (Telegram оборачивает текст дважды)
    .replace(/<div class="tgme_widget_message_text[^"]*"[^>]*>/g, '')
    .replace(/<\/div>/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    // эмодзи-картинка: <i class="emoji" ...><b>❤️</b></i> → ❤️
    .replace(/<i class="emoji"[^>]*>(?:<b>)?([\s\S]*?)(?:<\/b>)?<\/i>/g, '$1')
    .replace(
      /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
      (_m, href: string, inner: string) => {
        const text = decodeEntities(inner.replace(/<[^>]+>/g, '')).trim();
        const url = decodeEntities(href);
        // ссылка-эмодзи (без букв и цифр) остаётся просто символом
        const plain = !/^https?:\/\//.test(url) || !/[\p{L}\p{N}]/u.test(text);
        const bare = /^https?:\/\//.test(text) || text === url;
        links.push(plain ? text : bare ? url : `${text} (${url})`);
        return `${MARK}${links.length - 1}${MARK}`;
      }
    )
    .replace(/<[^>]+>/g, '');
  return decodeEntities(s)
    .replace(MARKED, (_m, i: string) => links[Number(i)])
    .trim();
}

const bg = (style: string) => style.match(/background-image:url\('([^']+)'\)/);

export function parseChannelPage(html: string): TgPage {
  const posts: TgPost[] = [];
  const chunks = html.split(/<div class="tgme_widget_message_wrap\b/).slice(1);
  for (const chunk of chunks) {
    const post = parseMessage(chunk);
    if (post) posts.push(post);
  }
  const more = html.match(/class="tme_messages_more[^"]*" data-before="(\d+)"/);
  return { posts, before: more ? Number(more[1]) : null };
}

function parseMessage(chunk: string): TgPost | null {
  const idm = chunk.match(/data-post="([^"/]+)\/(\d+)"/);
  const date = chunk.match(
    /class="tgme_widget_message_date"[^>]*>\s*<time datetime="([^"]+)"/
  );
  if (!idm || !date) return null;
  const id = Number(idm[2]);

  // Картинки: фото (одиночные и в группе), превью видео и кружков — в порядке появления.
  const images: string[] = [];
  const media =
    /<(?:a|div) class="tgme_widget_message_photo_wrap[^"]*"[^>]*style="([^"]*)"|<i class="tgme_widget_message_(?:video|roundvideo)_thumb"[^>]*style="([^"]*)"/g;
  for (const m of chunk.matchAll(media)) {
    const url = bg(m[1] ?? m[2] ?? '');
    if (url && !images.includes(decodeEntities(url[1])))
      images.push(decodeEntities(url[1]));
  }

  const textAt = chunk.search(
    /<div class="tgme_widget_message_text js-message_text"/
  );
  const text = textAt >= 0 ? htmlToText(innerDiv(chunk, textAt)) : '';

  const fwd = chunk.match(
    /<a class="tgme_widget_message_forwarded_from_name"(?: href="([^"]*)")?[^>]*>([\s\S]*?)<\/a>|<span class="tgme_widget_message_forwarded_from_name"[^>]*>([\s\S]*?)<\/span>/
  );
  const forwardedFrom: TgForward | null = fwd
    ? {
        name: decodeEntities(
          (fwd[2] ?? fwd[3] ?? '').replace(/<[^>]+>/g, '')
        ).trim(),
        url: fwd[1] ? decodeEntities(fwd[1]) : null,
      }
    : null;

  return {
    id,
    url: `https://t.me/${idm[1]}/${id}`,
    date: date[1],
    text,
    images,
    hasVideo: /tgme_widget_message_(?:video_player|roundvideo)\b/.test(chunk),
    hasAudio: /tgme_widget_message_document_icon[^"]*\baudio\b/.test(chunk),
    forwardedFrom,
  };
}
