import { splitPlaceholders } from './model';

describe('splitPlaceholders', () => {
  it('выделяет заглушку оператора внутри абзаца', () => {
    expect(splitPlaceholders('Оператор: [ВПИШИ: ИНН], адрес.')).toEqual([
      { ph: false, text: 'Оператор: ' },
      { ph: true, text: 'ИНН' },
      { ph: false, text: ', адрес.' },
    ]);
  });
});
