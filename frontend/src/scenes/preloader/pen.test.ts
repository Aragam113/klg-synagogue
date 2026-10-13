import {
  CEIL_MS,
  MIN_DRAW_MS,
  penAllowance,
  penKeyframes,
  penProfile,
  penStep,
  type PenState,
} from './pen';

/** Pen timing: fast along the straight leads, ≈2–2.5× slower while the star is drawn, smooth in between. */
describe('penKeyframes', () => {
  const frames = penKeyframes(1440, 900);
  // drawn fraction of the path (0..1) at a time fraction, by linear interpolation between keyframes
  const drawnAt = (t: number) => {
    const i = frames.findIndex((f) => f.offset >= t);
    const a = frames[Math.max(0, i - 1)];
    const b = frames[i];
    const k = b.offset === a.offset ? 0 : (t - a.offset) / (b.offset - a.offset);
    return 1 - (a.dash + (b.dash - a.dash) * k);
  };
  // time fraction at which a given part of the path is drawn
  const timeAt = (s: number) => {
    const i = frames.findIndex((f) => 1 - f.dash >= s);
    const a = frames[Math.max(0, i - 1)];
    const b = frames[i];
    const da = 1 - a.dash;
    const db = 1 - b.dash;
    return a.offset + (b.offset - a.offset) * (db === da ? 0 : (s - da) / (db - da));
  };
  const speed = (s: number) => 0.02 / (timeAt(s + 0.01) - timeAt(s - 0.01));

  it('runs from an empty to a fully drawn line, monotonically', () => {
    expect(frames[0]).toEqual({ offset: 0, dash: 1 });
    expect(frames[frames.length - 1]).toEqual({ offset: 1, dash: 0 });
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].offset).toBeGreaterThanOrEqual(frames[i - 1].offset);
      expect(frames[i].dash).toBeLessThanOrEqual(frames[i - 1].dash);
    }
    expect(drawnAt(0.5)).toBeGreaterThan(0);
  });

  it('the star (middle of the path) is drawn 2–2.5× slower than the straight lead-in', () => {
    // 1440×900: the leads are ~632 px each of ~3200 px, so s=0.08 is on the lead-in and s=0.5 inside the star
    const ratio = speed(0.08) / speed(0.5);
    expect(ratio).toBeGreaterThanOrEqual(2);
    expect(ratio).toBeLessThanOrEqual(2.6);
  });

  it('changes speed smoothly — no jump between neighbouring samples', () => {
    for (let s = 0.03; s < 0.97; s += 0.01) {
      const r = speed(s + 0.01) / speed(s);
      expect(r).toBeGreaterThan(0.8);
      expect(r).toBeLessThan(1.25);
    }
  });
});

/** The pen follows the real loading: free along the lead-in, the star as the content arrives, out once it is in. */
describe('penAllowance — how far the pen may draw for the loading so far', () => {
  const prof = penProfile(390, 844);
  it('nothing loaded yet: the lead-in up to the star is free', () => {
    expect(penAllowance(0, 0, prof)).toBeCloseTo(prof.starFrom, 5);
  });
  it('half loaded: inside the star, past its start, short of its end', () => {
    const s = penAllowance(0.5, 0, prof);
    expect(s).toBeGreaterThan(prof.starFrom + 0.2 * (prof.starTo - prof.starFrom));
    expect(s).toBeLessThan(prof.starTo);
  });
  it('everything loaded: the whole line', () => {
    expect(penAllowance(1, 300, prof)).toBe(1);
  });
  it('a stalled load still creeps on (the line never looks frozen) but stays inside the star', () => {
    const a = penAllowance(0, 1000, prof);
    const b = penAllowance(0, 5000, prof);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(prof.starTo);
  });
  it('past the ceiling the site goes on whatever is still loading', () => {
    expect(CEIL_MS).toBeGreaterThanOrEqual(5000);
    expect(CEIL_MS).toBeLessThanOrEqual(10000);
    expect(penAllowance(0.1, CEIL_MS, prof)).toBe(1);
  });
});

describe('penStep — the pen moves at most at full speed, eases into the allowance, never jumps', () => {
  const prof = penProfile(390, 844);
  const run = (allow: (t: number) => number, ms: number, dt = 1000 / 60) => {
    let st: PenState = { tau: 0, v: 0 };
    const arcs: number[] = [];
    for (let t = 0; t < ms; t += dt) {
      st = penStep(st, dt, allow(t), prof);
      arcs.push(prof.arcAt(st.tau));
    }
    return { st, arcs };
  };
  it('fast connection (all in at once): the whole star forms in about MIN_DRAW_MS — not faster', () => {
    expect(MIN_DRAW_MS).toBeGreaterThanOrEqual(1500);
    expect(MIN_DRAW_MS).toBeLessThanOrEqual(2200);
    const { arcs } = run(() => 1, 4000);
    const doneAt = arcs.findIndex((s) => s >= 0.999) * (1000 / 60);
    expect(doneAt).toBeGreaterThanOrEqual(MIN_DRAW_MS - 50);
    expect(doneAt).toBeLessThanOrEqual(MIN_DRAW_MS + 250);
  });
  it('never draws past the allowance and never goes back', () => {
    const { arcs } = run((t) => (t < 1500 ? 0.4 : 0.3), 3000);
    arcs.forEach((s, i) => {
      expect(s).toBeLessThanOrEqual(0.4 + 1e-9);
      if (i) expect(s).toBeGreaterThanOrEqual(arcs[i - 1]);
    });
  });
  it('held back, then everything arrives: speed picks up smoothly (no jerk)', () => {
    const { arcs } = run((t) => (t < 2000 ? 0.35 : 1), 5000);
    const full = 1 / (MIN_DRAW_MS / (1000 / 60));
    for (let i = 2; i < arcs.length; i++) {
      const v0 = arcs[i - 1] - arcs[i - 2];
      const v1 = arcs[i] - arcs[i - 1];
      // per-frame change of the arc speed: a fraction of the full speed, never a jump
      expect(Math.abs(v1 - v0)).toBeLessThan(0.35 * full * 2.5);
    }
    expect(arcs[arcs.length - 1]).toBe(1);
  });
});
