import type { PaymentPurpose, PaymentStatus } from '@/store/api/payments';

/** Пресеты пожертвования: кратные «хай», 18. */
export const PRESETS = [180, 360, 540, 1800, 3600, 18000] as const;

export const MIN_AMOUNT = 100;
export const MAX_AMOUNT = 1_000_000;

/** Опрос статуса на экране «Спасибо». */
export const POLL_INTERVAL_MS = 3000;
export const POLL_LIMIT_MS = 120_000;

/** «1 000 000» → 1000000; не целое / не число → NaN. */
export const parseAmount = (raw: string) => {
  const s = raw.replace(/\s/g, '');
  return /^\d+$/.test(s) ? Number(s) : NaN;
};

/** Ключ ошибки поля суммы (как у бэка): required | out_of_range. */
export function amountError(raw: string): 'required' | 'out_of_range' | undefined {
  if (raw.trim() === '') return 'required';
  const n = parseAmount(raw);
  if (!Number.isFinite(n) || n < MIN_AMOUNT || n > MAX_AMOUNT) return 'out_of_range';
  return undefined;
}

/** Кадиш: месяцы × тариф из настроек; null — тариф не задан, сумма свободная. */
export function kaddishTotal(months: number | undefined, tariff: number | null | undefined) {
  return months && tariff ? months * tariff : null;
}

/** Билет: места × цена на сегодня (показ до кассы; сумму всё равно считает сервер). */
export function eventTotal(seats: number | undefined, priceRub: number | null | undefined) {
  return seats && priceRub ? seats * priceRub : null;
}

/** Шаг опроса статуса: ждать ещё, итог получен, или вышло 2 минуты. */
export function pollStep(
  status: PaymentStatus,
  startedMs: number,
  nowMs: number
): 'wait' | 'done' | 'timeout' {
  if (status !== 'pending') return 'done';
  return nowMs - startedMs > POLL_LIMIT_MS ? 'timeout' : 'wait';
}

export interface DonationValues {
  amount: string;
  recurring: boolean;
  anonymous: boolean;
  donorName: string;
  email: string;
  phone: string;
  comment: string;
  dedication: string;
  consent: boolean;
}

export interface PaymentContext {
  purpose: PaymentPurpose;
  fundraiserSlug?: string;
  requestId?: string;
  registrationId?: string;
}

/** Значения формы → тело `POST /payments`; пустые строки не отправляются. */
export function paymentBody(v: DonationValues, ctx: PaymentContext): Record<string, unknown> {
  const text = (s: string) => (s.trim() === '' ? undefined : s.trim());
  const amount = parseAmount(v.amount);
  const body: Record<string, unknown> = {
    ...ctx,
    amountRub: Number.isFinite(amount) ? amount : undefined,
    recurring: ctx.purpose === 'donation' ? v.recurring : undefined,
    anonymous: v.anonymous,
    donorName: v.anonymous ? undefined : text(v.donorName),
    email: text(v.email),
    phone: text(v.phone),
    comment: text(v.comment),
    dedication: text(v.dedication),
    consent: v.consent,
  };
  return Object.fromEntries(Object.entries(body).filter(([, x]) => x !== undefined));
}

/** Куда вести после `POST /payments`: fake-касса — путь внутри сайта, реальная — внешний адрес. */
export function confirmTarget(url: string): { internal: string } | { external: string } {
  return url.startsWith('/') ? { internal: url } : { external: url };
}

/** Лента посвящений для `<Marquee>`: имя (или «Анонимно»), затем текст курсивом. */
export function dedicationItems<
  D extends { name: string | null; anonymous: boolean; text: string },
>(list: readonly D[], anonymousLabel: string): { text: string; italic?: boolean }[] {
  return list.flatMap((d) => [
    { text: d.anonymous || !d.name ? anonymousLabel : d.name },
    { text: d.text, italic: true },
  ]);
}
