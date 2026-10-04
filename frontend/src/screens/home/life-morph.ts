import { useEffect } from 'react';

import { lifeArch } from './model';

/** Offset of `el` from the top of `ancestor` by the offsetParent chain (layout only: transforms do not count). */
const offsetWithin = (el: HTMLElement, ancestor: HTMLElement): number => {
  let y = 0;
  for (
    let e: HTMLElement | null = el;
    e && e !== ancestor;
    e = e.offsetParent as HTMLElement | null
  )
    y += e.offsetTop;
  return y;
};

/**
 * Phone «Community life»: measures the entry arch (`lifeArch`) and writes it to the pinned screen as
 * `--life-top`/`--life-bottom` (px). Layout is read only when a size changes (ResizeObserver: the screen — rotation,
 * `--vh-fix` — the head, the first chapter — language, fonts), never per frame: the scroll only moves `--p`.
 */
export const useLifeMorph = (lang: string) => {
  useEffect(() => {
    if (typeof document === 'undefined' || typeof ResizeObserver === 'undefined') return undefined;
    const sticky = document.querySelector<HTMLElement>('#community .pinned__sticky');
    const head = sticky?.querySelector<HTMLElement>('.pinned__head');
    const first = sticky?.querySelector<HTMLElement>('.pinned__chapter .home-chapter');
    const title = first?.querySelector<HTMLElement>('h3');
    if (!sticky || !head || !first || !title) return undefined;
    const measure = () => {
      const a = lifeArch({
        screenH: sticky.offsetHeight,
        headBottom: offsetWithin(head, sticky) + head.offsetHeight,
        textTop: offsetWithin(title, sticky),
      });
      sticky.style.setProperty('--life-top', `${a.top}px`);
      sticky.style.setProperty('--life-bottom', `${a.bottom}px`);
    };
    const ro = new ResizeObserver(measure);
    for (const el of [sticky, head, first]) ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [lang]);
};
