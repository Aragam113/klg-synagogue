import { useEffect } from 'react';

import {
  canVibrate,
  HOLD_MS,
  movedTooFar,
  PRESS_SLOP,
  pressKind,
  pressTarget,
  RELEASE_MS,
  rippleGeometry,
  rippleProgress,
  type PressKind,
} from './press-model';

/**
 * One delegated listener set for the whole document (site + admin): pointerdown marks the pressed element with
 * `data-pressed="<kind>"` (+ `data-press-kind`, ripple origin `--rx/--ry/--rd`), > HOLD_MS adds `data-held`,
 * release swaps them for `data-released="pressed|held"` for RELEASE_MS (spring back, ripple fade, `--rip-s`).
 * Moving > PRESS_SLOP px, leaving the element, pointercancel (the browser took the gesture for a scroll), focus leaving it, window blur — drop the press. Purely visual: the click
 * still comes from the browser, the hold never acts, context menus are untouched. Looks: styles/interact.css.
 */
interface Active {
  el: HTMLElement;
  kind: PressKind;
  id: number;
  x: number;
  y: number;
  t0: number;
  rect: DOMRect;
  hold: ReturnType<typeof setTimeout>;
}

let active: Active | null = null;
let lastBuzz = -Infinity;
const releaseTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

const prepare = (el: HTMLElement, kind: PressKind) => {
  if (el.dataset.pressKind !== kind) el.dataset.pressKind = kind;
  // the ripple is an absolutely positioned ::before — the host needs a containing block
  if (kind === 'solid' && getComputedStyle(el).position === 'static')
    el.style.position = 'relative';
};

const press = (el: HTMLElement, id: number, x: number, y: number, centre: boolean) => {
  if (active) release(false);
  const kind = pressKind(el);
  prepare(el, kind);
  const rect = el.getBoundingClientRect();
  const g = centre
    ? rippleGeometry(rect, rect.left + rect.width / 2, rect.top + rect.height / 2)
    : rippleGeometry(rect, x, y);
  el.style.setProperty('--rx', `${g.x}px`);
  el.style.setProperty('--ry', `${g.y}px`);
  el.style.setProperty('--rd', `${g.d}px`);
  const prev = releaseTimers.get(el);
  if (prev) clearTimeout(prev);
  el.removeAttribute('data-released');
  el.dataset.pressed = kind;
  const hold = setTimeout(() => {
    if (active?.el === el) el.dataset.held = '';
  }, HOLD_MS);
  active = { el, kind, id, x, y, t0: performance.now(), rect, hold };
};

function release(spring = true) {
  const a = active;
  if (!a) return;
  active = null;
  clearTimeout(a.hold);
  const { el } = a;
  const held = el.hasAttribute('data-held');
  el.style.setProperty('--rip-s', rippleProgress(performance.now() - a.t0).toFixed(3));
  el.removeAttribute('data-pressed');
  el.removeAttribute('data-held');
  if (!spring) {
    el.removeAttribute('data-released');
    return;
  }
  el.dataset.released = held ? 'held' : 'pressed';
  releaseTimers.set(
    el,
    setTimeout(() => {
      el.removeAttribute('data-released');
      releaseTimers.delete(el);
    }, RELEASE_MS)
  );
}

const buzz = () => {
  const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
  if (typeof nav.vibrate !== 'function' || nav.userActivation?.hasBeenActive === false) return;
  const now = performance.now();
  if (!canVibrate(lastBuzz, now)) return;
  lastBuzz = now;
  try {
    nav.vibrate(8);
  } catch {
    /* blocked without a user gesture — the visual press is enough */
  }
};

const onDown = (e: PointerEvent) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (!e.isPrimary) return;
  const el = pressTarget(e.target);
  if (!el) return;
  press(el, e.pointerId, e.clientX, e.clientY, false);
  if (e.pointerType === 'touch') buzz();
};

const onMove = (e: PointerEvent) => {
  const a = active;
  if (!a || e.pointerId !== a.id) return;
  const r = a.rect;
  const outside =
    e.clientX < r.left - PRESS_SLOP ||
    e.clientX > r.right + PRESS_SLOP ||
    e.clientY < r.top - PRESS_SLOP ||
    e.clientY > r.bottom + PRESS_SLOP;
  // a swipe over a carousel/feed (or a mouse drag of the slider) is not a press
  if (outside || movedTooFar(e.clientX - a.x, e.clientY - a.y)) release(false);
};

const onUp = (e: PointerEvent) => {
  if (active && e.pointerId === active.id) release(true);
};
const onCancel = () => release(false);

const onFocusOut = (e: FocusEvent) => {
  if (active && e.target instanceof Node && active.el.contains(e.target)) release(false);
};

const KEYS = new Set(['Enter', ' ']);
const onKeyDown = (e: KeyboardEvent) => {
  if (e.repeat || !KEYS.has(e.key)) return;
  const el = pressTarget(e.target);
  if (!el || el.matches('input, textarea, select')) return;
  if (e.key === ' ' && el.tagName === 'A') return; // space scrolls on links
  press(el, -1, 0, 0, true);
};
const onKeyUp = (e: KeyboardEvent) => {
  if (active?.id === -1 && KEYS.has(e.key)) release(true);
};

/** Wires the press system to `doc`; returns the uninstall. Idempotent per document. */
export const installPress = (doc: Document = document): (() => void) => {
  const w = doc.defaultView ?? window;
  const opts = { capture: true, passive: true } as const;
  doc.addEventListener('pointerdown', onDown, opts);
  doc.addEventListener('pointermove', onMove, opts);
  doc.addEventListener('pointerup', onUp, opts);
  doc.addEventListener('pointercancel', onCancel, opts);
  doc.addEventListener('dragstart', onCancel, opts);
  doc.addEventListener('keydown', onKeyDown, opts);
  doc.addEventListener('keyup', onKeyUp, opts);
  doc.addEventListener('focusout', onFocusOut, opts);
  w.addEventListener('blur', onCancel);
  return () => {
    release(false);
    doc.removeEventListener('pointerdown', onDown, opts);
    doc.removeEventListener('pointermove', onMove, opts);
    doc.removeEventListener('pointerup', onUp, opts);
    doc.removeEventListener('pointercancel', onCancel, opts);
    doc.removeEventListener('dragstart', onCancel, opts);
    doc.removeEventListener('keydown', onKeyDown, opts);
    doc.removeEventListener('keyup', onKeyUp, opts);
    doc.removeEventListener('focusout', onFocusOut, opts);
    w.removeEventListener('blur', onCancel);
  };
};

/** Mount once at the root (SiteShell): every pressable element on every page gets press/hold/release. */
export const usePressFeedback = (): void => {
  useEffect(() => installPress(), []);
};
