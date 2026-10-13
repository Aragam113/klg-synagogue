/** A horizontal span in px (left/right of a client rect). */
export interface Span {
  start: number;
  end: number;
}

/**
 * The card a phone rail is "on": the one with the largest visible share of its own width.
 * Works from client rects, so it needs no scrollLeft maths and is the same for LTR and RTL.
 * At rest that is the first card; at the end of the rail — the last one (it never reaches the start field).
 */
export const railActive = (view: Span, cards: Span[]): number => {
  let best = 0;
  let bestShare = -1;
  cards.forEach((c, i) => {
    const w = c.end - c.start;
    if (w <= 0) return;
    const seen = Math.max(0, Math.min(view.end, c.end) - Math.max(view.start, c.start));
    const share = seen / w;
    if (share > bestShare + 0.001) {
      best = i;
      bestShare = share;
    }
  });
  return best;
};
