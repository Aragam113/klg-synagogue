/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date | string | null): string | null {
  if (!date) return null;

  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    return new Date(date).toISOString().split('T')[0];
  }

  return date.toISOString().split('T')[0];
}

/**
 * Format datetime to ISO 8601 UTC
 */
export function formatDateTime(date: Date | string | null): string | null {
  if (!date) return null;

  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }

  return date.toISOString();
}
