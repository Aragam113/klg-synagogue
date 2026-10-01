import { lightboxKey, stepPhoto } from './model';

describe('лайтбокс', () => {
  it('стрелки листают по кругу', () => {
    expect(stepPhoto(0, 1, 3)).toBe(1);
    expect(stepPhoto(2, 1, 3)).toBe(0);
    expect(stepPhoto(0, -1, 3)).toBe(2);
  });
  it('клавиши: Esc закрывает, стрелки листают; в RTL «вправо» — назад', () => {
    expect(lightboxKey('Escape', 'ltr')).toBe('close');
    expect(lightboxKey('ArrowRight', 'ltr')).toBe(1);
    expect(lightboxKey('ArrowLeft', 'ltr')).toBe(-1);
    expect(lightboxKey('ArrowRight', 'rtl')).toBe(-1);
    expect(lightboxKey('Enter', 'ltr')).toBeNull();
  });
});
