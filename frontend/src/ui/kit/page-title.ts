/**
 * Document title: "<page> — <full site name>" («… — Новая синагога, Калининград»); without a page title,
 * or when the page title already is the full name (home), just the full name.
 */
export const pageTitle = (title: string | undefined, full: string): string =>
  title && title !== full ? `${title} — ${full}` : full;
