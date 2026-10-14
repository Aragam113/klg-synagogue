import { useEffect } from 'react';

import { lifeArch, lifeMask } from './model';

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
 * Phone «Community life»: measures the entry arch (`lifeArch`) and draws the plates around it (`lifeMask`): the paths
 * of the top and bottom plates of `.home-life__mask`, `--life-top-h`, `--life-bottom-y`, `--life-bottom` (the bottom
 * inset the bottom plate slides by) and `--life-sx` (the widening of the opening) on the pinned screen. Layout is read
 * only when a size changes (ResizeObserver: the screen — rotation, `--vh-fix` — the head, the first chapter —
 * language, fonts), never per frame: the opening itself is transforms on a scroll timeline (home.css).
 */
export const useLifeMorph = (lang: string) => {
  useEffect(() => {
    if (typeof document === 'undefined' || typeof ResizeObserver === 'undefined') return undefined;
    const sticky = document.querySelector<HTMLElement>('#community .pinned__sticky');
    const head = sticky?.querySelector<HTMLElement>('.pinned__head');
    const first = sticky?.querySelector<HTMLElement>('.pinned__chapter .home-chapter');
    const title = first?.querySelector<HTMLElement>('h3');
    const topSvg = sticky?.querySelector<SVGSVGElement>('.home-life__plate--top');
    const bottomSvg = sticky?.querySelector<SVGSVGElement>('.home-life__plate--bottom');
    if (!sticky || !head || !first || !title || !topSvg || !bottomSvg) return undefined;
    const measure = () => {
      const w = sticky.offsetWidth;
      const h = sticky.offsetHeight;
      // only the phone layout draws the window (the plates are display:none elsewhere)
      if (!w || !h || !topSvg.getClientRects().length) return;
      const a = lifeArch({
        screenH: h,
        headBottom: offsetWithin(head, sticky) + head.offsetHeight,
        textTop: offsetWithin(title, sticky),
      });
      const m = lifeMask({ w, h, top: a.top, bottom: a.bottom });
      if (m.topH <= 0 || m.bottomH <= 0) return;
      topSvg.setAttribute('viewBox', `0 0 ${w} ${m.topH}`);
      topSvg.querySelector('path')?.setAttribute('d', m.topPath);
      bottomSvg.setAttribute('viewBox', `0 0 ${w} ${m.bottomH}`);
      bottomSvg.querySelector('path')?.setAttribute('d', m.bottomPath);
      sticky.style.setProperty('--life-top', `${a.top}px`);
      sticky.style.setProperty('--life-top-h', `${m.topH}px`);
      sticky.style.setProperty('--life-bottom-y', `${m.bottomY}px`);
      sticky.style.setProperty('--life-bottom', `${a.bottom}px`);
      sticky.style.setProperty('--life-sx', String(m.sx));
    };
    const ro = new ResizeObserver(measure);
    for (const el of [sticky, head, first]) ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [lang]);
};
