const MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

/** Слаг из русского заголовка: транслит, латиница/цифры через дефис, ≤ 80 символов. */
export function slugify(text: string): string {
  const latin = [...text.toLowerCase()].map((ch) => MAP[ch] ?? ch).join('');
  const slug = latin
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return slug || 'item';
}

/** Первый свободный вариант: base, base-2, base-3, … */
export async function uniqueSlug(
  base: string,
  taken: (slug: string) => Promise<boolean>
): Promise<string> {
  let candidate = base;
  for (let n = 2; await taken(candidate); n++) candidate = `${base}-${n}`;
  return candidate;
}
