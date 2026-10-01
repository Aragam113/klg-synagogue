import { DRAW_MS, penKeyframes } from './pen';

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

  it('the whole stroke takes no longer than ~3.2 s', () => {
    expect(DRAW_MS).toBeLessThanOrEqual(3200);
    expect(DRAW_MS).toBeGreaterThanOrEqual(2400);
  });
});
