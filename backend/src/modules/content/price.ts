import type { PriceTier } from './entities';

/** Часовой пояс синагоги: «сегодня» для лестницы цен считается по Калининграду. */
export const CONTENT_TZ = 'Europe/Kaliningrad';

/** Дата YYYY-MM-DD в часовом поясе синагоги. */
export function localDate(now: Date, tz = CONTENT_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Индекс действующей ступени: первая, у которой `until ≥ сегодня` по Калининграду
 * (или `until = null` — бессрочная), иначе последняя. `null` — вход свободный.
 */
export function currentTierIndex(
  event: { isPaid: boolean; priceTiers: PriceTier[] | null },
  now: Date
): number | null {
  const tiers = event.priceTiers ?? [];
  if (!event.isPaid || tiers.length === 0) return null;
  const today = localDate(now);
  const idx = tiers.findIndex((t) => t.until === null || t.until >= today);
  return idx < 0 ? tiers.length - 1 : idx;
}

/** Цена билета на сегодня (см. `currentTierIndex`); `null` — вход свободный. */
export function currentPrice(
  event: { isPaid: boolean; priceTiers: PriceTier[] | null },
  now: Date
): number | null {
  const idx = currentTierIndex(event, now);
  return idx === null ? null : (event.priceTiers ?? [])[idx].priceRub;
}
