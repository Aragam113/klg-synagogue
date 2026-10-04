/** @jest-environment jsdom */
import {
  canVibrate,
  movedTooFar,
  pressKind,
  pressTarget,
  rippleGeometry,
  rippleProgress,
} from './press-model';

const html = (markup: string) => {
  document.body.innerHTML = markup;
  return document.body;
};

describe('press-model', () => {
  it('a finger that slid more than 8px is a swipe, not a press', () => {
    expect(movedTooFar(12, 0)).toBe(true);
    expect(movedTooFar(0, -9)).toBe(true);
    expect(movedTooFar(5, 5)).toBe(false); // 7.07px
    expect(movedTooFar(0, 0)).toBe(false);
  });

  it('ripple is centred on the touch point and covers the farthest corner', () => {
    const g = rippleGeometry({ left: 100, top: 50, width: 100, height: 40 }, 110, 60);
    expect(g.x).toBe(10);
    expect(g.y).toBe(10);
    // farthest corner (100, 40) from (10, 10): hypot(90, 30) = 94.87 → diameter 189.7
    expect(g.d).toBeCloseTo(189.74, 1);
  });

  it('ripple grows with the hold and saturates', () => {
    expect(rippleProgress(0)).toBe(0);
    expect(rippleProgress(5000)).toBe(1);
    const mid = rippleProgress(400);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(1);
  });

  it('vibrates at most once per 100 ms', () => {
    expect(canVibrate(-Infinity, 0)).toBe(true);
    expect(canVibrate(1000, 1050)).toBe(false);
    expect(canVibrate(1000, 1100)).toBe(true);
  });

  it('finds the interactive ancestor and its kind', () => {
    const body = html(`
      <a href="/x" class="btn btn--primary"><span id="b">Go</span></a>
      <a href="/n" class="card card--link"><h3 id="c">News</h3></a>
      <button class="lang__btn" id="l">RU</button>
      <a href="/f" class="ftr__link" id="f">Link</a>
      <input id="i" class="field__input" />
      <label class="check" id="chk"><input type="checkbox" id="cb" /> ok</label>
      <button class="btn" disabled id="d"><span id="ds">x</span></button>
      <button class="btn" data-press="off" id="o">x</button>
      <p id="p">plain text</p>`);
    const el = (id: string) => body.querySelector(`#${id}`)!;
    expect(pressKind(pressTarget(el('b'))!)).toBe('solid');
    expect(pressKind(pressTarget(el('c'))!)).toBe('card');
    expect(pressKind(pressTarget(el('l'))!)).toBe('solid');
    expect(pressKind(pressTarget(el('f'))!)).toBe('plain');
    expect(pressKind(pressTarget(el('i'))!)).toBe('field');
    expect(pressKind(pressTarget(el('cb'))!)).toBe('check');
    expect(pressTarget(el('ds'))).toBeNull();
    expect(pressTarget(el('o'))).toBeNull();
    expect(pressTarget(el('p'))).toBeNull();
  });
});
