/**
 * «Созвездие» — background Hebrew words behind a section: one big anchor word and smaller satellites
 * around it (far = smaller, paler, slower). Pure data, deterministic by `seed`: every page gets its own
 * but stable pattern. Positions are % of the section in logical coordinates (x from inline-start, so RTL
 * mirrors together with the title), sizes in rem on desktop (scaled down on phones by CSS).
 */

/** Common words: everyday Hebrew, no inventions. */
export const GHOST_WORDS = {
  shalom: 'שלום',
  bruchim: 'ברוכים הבאים',
  shabbat: 'שבת שלום',
  beitKnesset: 'בית הכנסת',
  kehila: 'קהילה',
  torah: 'תורה',
  chesed: 'חסד',
  tzedaka: 'צדקה',
  emuna: 'אמונה',
  yerushalayim: 'ירושלים',
  tfila: 'תפילה',
  chadashot: 'חדשות',
  zachor: 'זכור',
  kasher: 'כשר',
  tmunot: 'תמונות',
  chag: 'חג שמח',
  limud: 'לימוד',
  toda: 'תודה',
} as const;

const W = GHOST_WORDS;
/** shalom */
export const SHALOM = W.shalom;
/** baruchim haba'im — welcome */
export const BRUCHIM_HABAIM = W.bruchim;
/** Default set: the anchor «shalom» and the general words of the site. */
export const DEFAULT_GHOST_WORDS: readonly string[] = [
  W.shalom,
  W.kehila,
  W.torah,
  W.shabbat,
  W.beitKnesset,
  W.yerushalayim,
  W.chesed,
  W.emuna,
];

/** One floating word. */
export interface GhostWord {
  text: string;
  /** Centre of the word, % of the section (x from inline-start). */
  x: number;
  y: number;
  /** Font size, rem on desktop. */
  size: number;
  /** Opacity of the word (≈ .03–.07). */
  o: number;
  /** Scroll parallax shift over the section: vw by x, rem by y (near = bigger). */
  dx: number;
  dy: number;
  /** Desktop only: hidden below 768px. */
  desk: boolean;
}

/**
 * Where the section's title sits: centre; inline-start or inline-end column; head row at the top-start.
 * Satellites keep out of that zone; so does the anchor unless it is asked to be the centred backdrop.
 */
export type GhostTitleAt = 'center' | 'start' | 'end' | 'top';

/** Anchor placement: `free` — the free side opposite the title (centre for a centred title); `center` — backdrop. */
export type GhostAnchor = 'free' | 'center';

export interface GhostDensity {
  /** Words on desktop, anchor included (2–8). */
  desk: number;
  /** Words on phones (1–desk). */
  phone: number;
}

export const DEFAULT_DENSITY: GhostDensity = { desk: 6, phone: 3 };

export interface GhostLayoutInput {
  /** First word is the anchor; satellites take the rest in order (cycled if fewer than needed). */
  words?: readonly string[];
  seed: string;
  density?: Partial<GhostDensity>;
  titleAt?: GhostTitleAt;
  anchor?: GhostAnchor;
}

/** Rect in % of the section, logical x. */
export interface GhostZone {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Title zone per title position: no satellite centre may fall into it. */
export const TITLE_ZONE: Record<GhostTitleAt, GhostZone> = {
  center: { x0: 26, x1: 74, y0: 26, y1: 74 },
  start: { x0: 0, x1: 62, y0: 0, y1: 78 },
  end: { x0: 38, x1: 100, y0: 0, y1: 78 },
  top: { x0: 0, x1: 72, y0: 0, y1: 36 },
};

/** True when the centre of `w` lies in the title zone. */
export const underTitle = (w: Pick<GhostWord, 'x' | 'y'>, zone: GhostZone) =>
  w.x > zone.x0 && w.x < zone.x1 && w.y > zone.y0 && w.y < zone.y1;

/** Satellite slots around the edges; corners first (they take the bigger words). */
const CORNERS: [number, number][] = [
  [14, 18],
  [86, 82],
  [86, 16],
  [14, 84],
];
const EDGES: [number, number][] = [
  [80, 50],
  [20, 50],
  [50, 12],
  [50, 88],
  [34, 10],
  [66, 90],
  [70, 30],
  [30, 70],
  [30, 30],
  [70, 70],
];

/** Anchor centre on the free side, before jitter. */
const ANCHOR_AT: Record<GhostTitleAt, [number, number]> = {
  center: [50, 50],
  start: [77, 50],
  end: [23, 50],
  top: [50, 68],
};

/** FNV-1a string hash → mulberry32 PRNG in [0, 1). */
const rng = (seed: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, d = 100) => Math.round(v * d) / d;

/** Deterministic «Созвездие» layout for one section. */
export const ghostLayout = ({
  words = DEFAULT_GHOST_WORDS,
  seed,
  density,
  titleAt = 'center',
  anchor = 'free',
}: GhostLayoutInput): GhostWord[] => {
  const list = words.length ? words : DEFAULT_GHOST_WORDS;
  const desk = clamp(Math.round(density?.desk ?? DEFAULT_DENSITY.desk), 2, 8);
  const phone = clamp(Math.round(density?.phone ?? DEFAULT_DENSITY.phone), 1, desk);
  const zone = TITLE_ZONE[titleAt];
  const r = rng(seed);
  const jit = (span: number) => (r() - 0.5) * 2 * span;
  const sign = () => (r() < 0.5 ? -1 : 1);
  const shuffle = <T>(a: T[]) => {
    const out = [...a];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const out: GhostWord[] = [
    {
      text: list[0],
      x: round(
        (anchor === 'center' ? 50 : ANCHOR_AT[titleAt][0]) + jit(anchor === 'center' ? 5 : 3)
      ),
      y: round((anchor === 'center' ? 50 : ANCHOR_AT[titleAt][1]) + jit(4)),
      size: round(13.5 + r() * 2.2, 10),
      o: 0.07,
      dx: round(sign() * (12 + r() * 4), 10),
      dy: round(sign() * (2.5 + r()), 10),
      desk: false,
    },
  ];
  const slots = [...shuffle(CORNERS), ...shuffle(EDGES)]
    .map(([x, y]) => ({ x: clamp(x + jit(3), 6, 94), y: clamp(y + jit(3), 6, 94) }))
    .filter((s) => !underTitle(s, zone));
  const pool = list.length > 1 ? list.slice(1) : list;
  for (let i = 1; i < desk && i - 1 < slots.length; i++) {
    const s = slots[i - 1];
    const near = i <= 2; // two medium words, the rest small and far
    const k = (i - 1) / Math.max(1, desk - 2); // 0 → nearest of the small ones
    out.push({
      text: pool[(i - 1) % pool.length],
      x: round(s.x),
      y: round(s.y),
      size: round(near ? 6 + r() * 1.5 : 4.6 - k * 1.4, 10),
      o: round(near ? 0.055 - (i - 1) * 0.005 : 0.04 - k * 0.01, 1000),
      dx: round(sign() * (near ? 7 + r() * 2 : 2 + (1 - k) * 2), 10),
      dy: round(sign() * (near ? 3 + r() * 2 : 1.5 + (1 - k) * 1.5), 10),
      desk: i >= phone,
    });
  }
  return out;
};
