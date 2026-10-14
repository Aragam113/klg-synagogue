import { lifeArch, lifeMask } from './model';

describe('lifeArch (phone «Community life»: the arch the section enters with, before it opens to full screen)', () => {
  it('stands 12px under the big head and 16px above the chapter title lifted by 12px', () => {
    // screen 844, head ends at 150, chapter title starts at 520 → arch 162..(520 - 12 - 16 = 492) → bottom inset 352
    expect(lifeArch({ screenH: 844, headBottom: 150, textTop: 520 })).toEqual({
      top: 162,
      bottom: 352,
    });
  });
});

describe('lifeMask (plates of the section colour around the arch, opened by transforms only)', () => {
  // 432×844 screen, arch from 162 to 844 − 352 = 492, 16px side fields → round top r = 200 (centre y 362)
  const m = lifeMask({ w: 432, h: 844, top: 162, bottom: 352 });

  it('top plate: from the screen top to where the round top ends, the half circle cut out of its foot', () => {
    expect(m.topH).toBe(362);
    expect(m.topPath).toBe('M0 0H432V362H416A200 200 0 0 0 16 362H0Z');
  });

  it('bottom plate: from 7px above the arch foot to the screen bottom, with the 7px rounded corners', () => {
    expect(m.bottomY).toBe(485);
    expect(m.bottomH).toBe(359);
    expect(m.bottomPath).toBe('M0 0H16A7 7 0 0 0 23 7H409A7 7 0 0 0 416 0H432V359H0Z');
  });

  it('widens the opening to the full screen width by scaleX = 432 / 400', () => {
    expect(m.sx).toBeCloseTo(1.08, 3);
  });
});
