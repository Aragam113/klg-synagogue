/**
 * Press system model: which element reacts to a press, how, and the pure maths of the gesture.
 * The DOM wiring is `press.web.ts` (installed once by `usePressFeedback()` in SiteShell); the looks are
 * `src/ui/styles/interact.css`. Components need nothing: any link/button/field gets press + hold by itself;
 * `data-press="solid|card|plain|field|check"` forces a kind, `data-press="off"` opts out.
 */

/** Finger travel (px) after which a press becomes a swipe/scroll and is dropped. */
export const PRESS_SLOP = 8;
/** Pressed this long → `data-held` (visual only, never an action). */
export const HOLD_MS = 350;
/** Release spring length (matches `press-release` in interact.css). */
export const RELEASE_MS = 420;
/** Ripple reaches full size after this long (ease-out); matches `--ripple-grow` in interact.css. */
export const RIPPLE_GROW_MS = 1200;
/** Android haptic tick: at most once per this many ms. */
export const VIBRATE_GAP_MS = 100;

export type PressKind = 'solid' | 'card' | 'plain' | 'field' | 'check';

/** Everything a person can press. */
export const PRESS_TARGET = [
  'a[href]',
  'button',
  'summary',
  'select',
  'textarea',
  'input:not([type="hidden"])',
  '[role="button"]',
  '[role="tab"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="checkbox"]',
  'label.check',
  'label.don-radio',
  '[data-press]',
].join(',');

/** Filled shapes: press scale + darker + ripple from the touch point. */
export const SOLID_SEL = [
  '.btn',
  '.lang__btn',
  '.don-chip',
  '.don-toggle__btn',
  '.sch-toggle',
  '.nws-chip',
  '.sx-chip',
  '.adm-btn',
  '.adm-tab',
  '.adm__link',
  '.mnav__close',
  '.social',
  '.home-arrow',
  '.lbx__btn',
  '.sch-hol--link',
  '.cookie .btn',
].join(',');

/** Cards and tiles: pressed-in look, deeper and gold edge on hold. */
export const CARD_SEL = [
  '.card--link',
  '.cnt-photo',
  '.cnt-album',
  '.home-vcard',
  '.sx-card',
  '.nws-nb',
  '.nws-cover__btn',
  '.cnt-hits a',
  '.home-tile',
].join(',');

const FORCED: readonly PressKind[] = ['solid', 'card', 'plain', 'field', 'check'];

const isDisabled = (el: Element) =>
  (el as HTMLButtonElement).disabled === true ||
  el.getAttribute('aria-disabled') === 'true' ||
  el.closest('fieldset[disabled]') !== null;

/** The element that shows the press for an event target, or null (nothing pressable / disabled / opted out). */
export const pressTarget = (from: EventTarget | null): HTMLElement | null => {
  if (!from || !(from as Element).closest) return null;
  const el = (from as Element).closest(PRESS_TARGET) as HTMLElement | null;
  if (!el) return null;
  // a checkbox/radio inside a label reacts through the label
  const label =
    el.tagName === 'INPUT'
      ? (el.closest('label.check, label.don-radio') as HTMLElement | null)
      : null;
  const target = label ?? el;
  if (target.dataset.press === 'off' || isDisabled(target) || isDisabled(el)) return null;
  return target;
};

export const pressKind = (el: Element): PressKind => {
  const forced = (el as HTMLElement).dataset?.press as PressKind | undefined;
  if (forced && FORCED.includes(forced)) return forced;
  if (el.matches('label.check, label.don-radio')) return 'check';
  if (el.matches('input, select, textarea')) {
    const type = (el as HTMLInputElement).type;
    return type === 'checkbox' || type === 'radio' ? 'check' : 'field';
  }
  if (el.matches(CARD_SEL)) return 'card';
  if (el.matches(SOLID_SEL)) return 'solid';
  return 'plain';
};

export const movedTooFar = (dx: number, dy: number, slop = PRESS_SLOP) => Math.hypot(dx, dy) > slop;

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Ripple centre relative to the element and a diameter that reaches its farthest corner. */
export const rippleGeometry = (r: Box, clientX: number, clientY: number) => {
  const x = clientX - r.left;
  const y = clientY - r.top;
  const dx = Math.max(x, r.width - x);
  const dy = Math.max(y, r.height - y);
  return { x, y, d: 2 * Math.hypot(dx, dy) };
};

/** Ripple scale after `ms` of holding: ease-out cubic to 1 over RIPPLE_GROW_MS. */
export const rippleProgress = (ms: number) => {
  const t = Math.min(1, Math.max(0, ms / RIPPLE_GROW_MS));
  return 1 - (1 - t) ** 3;
};

export const canVibrate = (last: number, now: number, gap = VIBRATE_GAP_MS) => now - last >= gap;
