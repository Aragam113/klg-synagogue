import { useEffect, useRef, useState } from 'react';

import { PHOTO_TALL, PHOTOS } from '@/content';

import { COMMUNITY } from './model';

/** The photos start downloading once the section is this close (screens) — decoded long before it is on screen. */
const AHEAD = '300%';

/**
 * Phone «Community life» (≤ 767px, touch; hidden elsewhere by home.css): the chapter photos full screen. All four
 * are downloaded and decoded (`img.decode()`) once the section comes within AHEAD of the screen — no `src` change at
 * the moment a photo shows, no half-downloaded or undecoded photo on screen (`data-ready` gates it in CSS).
 * Each photo fades in over the previous one and drifts (Ken Burns) on the scroll timeline of the pinned screen, and
 * is not rendered outside its own chapter window (home.css): one or two full-screen layers at a time.
 */
export const LifePhotos = ({ active, alt }: { active: number; alt: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState<boolean[]>(() => COMMUNITY.map(() => false));

  useEffect(() => {
    const box = ref.current;
    if (!box || typeof IntersectionObserver === 'undefined') return undefined;
    let gone = false;
    const load = () => {
      box.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((img, i) => {
        img.src = img.dataset.src ?? '';
        const done = () => {
          if (!gone) setReady((r) => r.map((v, j) => v || j === i));
        };
        img
          .decode()
          .then(done)
          .catch(() => {
            // decode() rejects for a broken file or a detached node; a loaded image is still fine to show
            if (img.complete && img.naturalWidth) done();
          });
      });
    };
    const io = new IntersectionObserver(
      (list) => {
        // hidden (desktop, reduced motion): nothing to load
        if (!list.some((e) => e.isIntersecting) || !box.getClientRects().length) return;
        io.disconnect();
        load();
      },
      { rootMargin: `${AHEAD} 0px ${AHEAD} 0px` }
    );
    // only after the preloader: before the API data the page is short and the section looks near — its 1 MB of
    // photos would compete with the first screen on a slow network
    const html = document.documentElement;
    const mo = new MutationObserver(() => {
      if (!('appReady' in html.dataset)) return;
      mo.disconnect();
      io.observe(box);
    });
    if ('appReady' in html.dataset) io.observe(box);
    else mo.observe(html, { attributes: true, attributeFilter: ['data-app-ready'] });
    return () => {
      gone = true;
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div className="home-life__photos" ref={ref}>
      {COMMUNITY.map((c, i) => (
        <img
          key={c.id}
          className="home-life__photo"
          data-src={PHOTO_TALL[c.photo] ?? PHOTOS[c.photo]?.src}
          alt={i === active ? alt : ''}
          decoding="async"
          data-current={i === active}
          data-ready={ready[i] ? '' : undefined}
          style={{ ['--i' as string]: i }}
        />
      ))}
    </div>
  );
};
