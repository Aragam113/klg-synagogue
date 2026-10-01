import { kaliningradDate } from '../calendar/kaliningrad-time';
import type { PriceTier } from './entities';

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
  const today = kaliningradDate(now);
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
