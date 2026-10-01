import type { ProgressMode } from './engine';

/**
 * Scroll progress 0..1 of an element (the single source for engine.web.ts and the native stub).
 * 'through': 0 when the top enters the viewport bottom, 1 when the bottom leaves the top.
 * 'pin': 0..1 while a container taller than the viewport scrolls by; if it is not taller, a step at top = 0.
 */
export const progressOf = (
  rect: { top: number; height: number },
  vh: number,
  mode: ProgressMode
): number => {
  if (mode === 'pin') {
    const run = rect.height - vh;
    if (run <= 0) return rect.top < 0 ? 1 : 0;
    return Math.min(1, Math.max(0, -rect.top / run));
  }
  return Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
};
