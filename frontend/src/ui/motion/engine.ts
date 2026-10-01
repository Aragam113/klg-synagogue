/** Native fallback: no scroll engine, everything static. The web build uses engine.web.ts (same exports). */
export type ProgressMode = 'through' | 'pin';
export type MotionEl = HTMLElement | SVGElement;
export interface RegisterOptions {
  /** 'through' (default): 0 when the top enters the viewport bottom, 1 when the bottom leaves the top. 'pin': 0..1 while a tall sticky container scrolls by. */
  mode?: ProgressMode;
  /** Called on every written change of `--p` (for discrete state such as the active chapter). */
  onChange?: (p: number) => void;
}
export { progressOf } from './progress';
export const reducedMotion = (): boolean => true;
export const motionAllowed = (): boolean => false;
export const pinAllowed = (): boolean => false;
export const startEngine = (): void => undefined;
export const stopEngine = (): void => undefined;
export const registerProgress =
  (_el: MotionEl, _opts?: RegisterOptions): (() => void) =>
  () =>
    undefined;
export const registerReveal =
  (_el: MotionEl): (() => void) =>
  () =>
    undefined;
export const scrollToTop = (): void => undefined;
export const lockScroll = (_locked: boolean): void => undefined;
