import { railActive } from './rail-model';

// 390px phone: rail viewport 0..390, cards 320px wide with a 12px gap, 16px side field.
const card = (start: number) => ({ start, end: start + 320 });

describe('railActive', () => {
  it('is the first card at rest', () => {
    expect(railActive({ start: 0, end: 390 }, [card(16), card(348), card(680)])).toBe(0);
  });

  it('is the snapped card in the middle', () => {
    // scrolled by 332: card 1 sits at the 16px field, its neighbours peek
    expect(railActive({ start: 0, end: 390 }, [card(-316), card(16), card(348)])).toBe(1);
  });

  it('is the last card at the end of the rail, though it cannot reach the start field', () => {
    // max scroll: the last card ends at 374 (16px field on the right)
    expect(railActive({ start: 0, end: 390 }, [card(-598), card(-266), card(54)])).toBe(2);
  });

  it('does not depend on direction: RTL cards run right to left', () => {
    // he: card 0 on the right, card 1 peeking on the left
    expect(railActive({ start: 0, end: 390 }, [card(54), card(-278), card(-610)])).toBe(0);
    expect(railActive({ start: 0, end: 390 }, [card(386), card(54), card(-278)])).toBe(1);
  });

  it('is 0 without cards', () => {
    expect(railActive({ start: 0, end: 390 }, [])).toBe(0);
  });
});
