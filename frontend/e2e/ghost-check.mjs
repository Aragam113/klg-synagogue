/**
 * Shared smoke check of «Созвездие» (GhostField): satellite words must not lie under the section title.
 * The anchor (`.gf-anchor`) is the deliberate backdrop and is skipped. A satellite fails when more than
 * `MAX_SHARE` of its glyph box overlaps an h1/h2 of the same section. Returns offenders as strings.
 */
export const MAX_SHARE = 0.15;

export const ghostUnderTitle = (page) =>
  page.evaluate((max) => {
    const out = [];
    for (const field of document.querySelectorAll('.gf')) {
      const sec = field.parentElement;
      const titles = [...sec.querySelectorAll('h1, h2')]
        .map((h) => h.getBoundingClientRect())
        .filter((r) => r.width && r.height);
      for (const pos of field.querySelectorAll('.gf-pos:not(.gf-anchor)')) {
        const w = pos.querySelector('.gf-w');
        if (!w || getComputedStyle(pos).display === 'none') continue;
        const a = w.getBoundingClientRect();
        if (!a.width || !a.height) continue;
        for (const t of titles) {
          const ix = Math.max(0, Math.min(a.right, t.right) - Math.max(a.left, t.left));
          const iy = Math.max(0, Math.min(a.bottom, t.bottom) - Math.max(a.top, t.top));
          const share = (ix * iy) / (a.width * a.height);
          if (share > max) out.push(`${field.dataset.ghost}: «${w.textContent}» ${Math.round(share * 100)}%`);
        }
      }
    }
    return out;
  }, MAX_SHARE);
