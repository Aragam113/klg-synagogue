import { lifeArch } from './model';

describe('lifeArch (phone «Community life»: the arch the section enters with, before it opens to full screen)', () => {
  it('stands 12px under the big head and 16px above the chapter title lifted by 12px', () => {
    // screen 844, head ends at 150, chapter title starts at 520 → arch 162..(520 - 12 - 16 = 492) → bottom inset 352
    expect(lifeArch({ screenH: 844, headBottom: 150, textTop: 520 })).toEqual({
      top: 162,
      bottom: 352,
    });
  });
});
