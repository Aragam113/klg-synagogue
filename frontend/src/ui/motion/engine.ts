/** Native fallback: no scroll engine, everything static. The web build uses engine.web.ts (same exports). */
export type ProgressMode = 'through' | 'pin';
export type MotionEl = HTMLElement | SVGElement;
export interface RegisterOptions {
  /** 'through' (default): 0 when the top enters the viewport bottom, 1 when the bottom leaves the top. 'pin': 0..1 while a tall sticky container scrolls by. */
  mode?: ProgressMode;
  /** Called on every written change of `--p` (for discrete state such as the active chapter). */
  onChange?: (p: number) => void;
  /** Touch, 'pin' mode: number of chapters — once the scroll rests inside, the page glides to the nearest stop. */
  snap?: number;
  /** false: compute `p` and call onChange only, never write `--p` (the CSS of the element runs on a scroll timeline). */
  css?: boolean;
  /** The registration exists only to write `--p` for CSS: skipped where scroll timelines drive that CSS. */
  cssOnly?: boolean;
  /** The element's own CSS runs on a scroll timeline where supported: `--p` is written only in the fallback. */
  timeline?: boolean;
}
export { progressOf } from './progress';
export const reducedMotion = (): boolean => true;
export const motionAllowed = (): boolean => false;
export const pinAllowed = (): boolean => false;
/** Touch scroll path (see touch-scroll.ts); false on a fine pointer, reduced motion, native. */
export const touchMode = (): boolean => false;
/** CSS scroll-driven animations drive the `--p` choreography (html[data-sda]); false on native. */
export const scrollTimelines = (): boolean => false;
export const startEngine = (): void => undefined;
export const stopEngine = (): void => undefined;
export const registerProgress =
  (_el: MotionEl, _opts?: RegisterOptions): (() => void) =>
  () =>
    undefined;
export const registerOnscreen =
  (_el: MotionEl): (() => void) =>
  () =>
    undefined;
export const registerReveal =
  (_el: MotionEl): (() => void) =>
  () =>
    undefined;
export const scrollToTop = (): void => undefined;
export const lockScroll = (_locked: boolean): void => undefined;
