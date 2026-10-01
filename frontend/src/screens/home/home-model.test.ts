import { getContent } from '@/content';

import { blockState, sceneChapters } from './home-model';

describe('sceneChapters — 4 главы истории поверх сцены', () => {
  it('1896 / 1938 / 2018 / Сегодня — из текстов раздела «История», без выдуманных дат', () => {
    const ch = sceneChapters(getContent('ru').history, 'Сегодня');
    expect(ch.map((c) => c.label)).toEqual(['1896', '1938', '2018', 'Сегодня']);
    expect(ch.map((c) => c.id)).toEqual(['koenigsberg', 'kristallnacht', 'opening', 'today']);
    expect(ch[1].title).toBe('Хрустальная ночь');
    expect(ch[2].text).toContain('8 ноября 2018');
    ch.forEach((c) => expect(c.text.length).toBeGreaterThan(20));
  });
  it('нет главы в контенте → она просто пропадает (не падает)', () => {
    const h = getContent('en').history;
    const ch = sceneChapters(
      { ...h, chapters: h.chapters.filter((c) => c.id !== 'kristallnacht') },
      'Today'
    );
    expect(ch.map((c) => c.id)).toEqual(['koenigsberg', 'opening', 'today']);
    expect(ch[2].label).toBe('Today');
  });
  it('глава «Сегодня — дом общины»: метка «Сегодня», заголовок не повторяет метку', () => {
    const ch = sceneChapters(getContent('ru').history, 'Сегодня', {
      title: 'Дом общины',
      italic: 'общины',
    });
    const today = ch[3];
    expect(today.label).toBe('Сегодня');
    expect(today.title).toBe('Дом общины');
    expect(today.italic).toBe('общины');
    expect(today.text).toContain('хупа');
  });
});

describe('blockState — секция главной по ответу API (падение API не роняет главную)', () => {
  const ok = (items: unknown[]) => ({ isLoading: false, isError: false, items });
  it('загрузка → loading; данные → ready; пусто → empty', () => {
    expect(blockState({ isLoading: true, isError: false, items: undefined }, 'empty')).toBe(
      'loading'
    );
    expect(blockState(ok([1, 2]), 'empty')).toBe('ready');
    expect(blockState(ok([]), 'empty')).toBe('empty');
  });
  it('ошибка → то, что выбрала секция: пустое состояние или скрыть', () => {
    const err = { isLoading: false, isError: true, items: undefined };
    expect(blockState(err, 'empty')).toBe('empty');
    expect(blockState(err, 'hidden')).toBe('hidden');
    expect(blockState(ok([]), 'hidden')).toBe('hidden');
  });
});
