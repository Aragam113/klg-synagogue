import { matchStaticPages } from '@/screens/search/static-pages';

import {
  accumulate,
  fundraiserProgress,
  mergeById,
  splitLinks,
  ticketLadder,
} from './content-model';

describe('fundraiserProgress', () => {
  it('процент и остаток', () => {
    expect(fundraiserProgress({ goalRub: 200000, raisedRub: 50000 })).toEqual({
      percent: 25,
      leftRub: 150000,
    });
  });
  it('перевыполнение — 100% и 0 осталось; нулевая цель не делит на ноль', () => {
    expect(fundraiserProgress({ goalRub: 1000, raisedRub: 1500 })).toEqual({
      percent: 100,
      leftRub: 0,
    });
    expect(fundraiserProgress({ goalRub: 0, raisedRub: 0 })).toEqual({ percent: 0, leftRub: 0 });
  });
});

describe('ticketLadder', () => {
  const tiers = [
    { until: '2026-10-10', priceRub: 500 },
    { until: '2026-10-20', priceRub: 700 },
    { until: null, priceRub: 900 },
  ];
  it('действующая ступень — индекс от бэкенда (по Калининграду), без пересчёта по дате', () => {
    // одинаковые цены у соседних ступеней: по priceNow их не различить, по индексу — да
    const same = [
      { until: '2026-10-10', priceRub: 500 },
      { until: '2026-10-20', priceRub: 500 },
      { until: null, priceRub: 900 },
    ];
    expect(ticketLadder(same, 1).map((t) => t.state)).toEqual(['past', 'current', 'next']);
    expect(ticketLadder(tiers, 0).map((t) => t.state)).toEqual(['current', 'next', 'next']);
  });
  it('нет индекса (бесплатное) — ступени без подсветки', () => {
    expect(ticketLadder(tiers, null).map((t) => t.state)).toEqual(['next', 'next', 'next']);
  });
});

describe('mergeById («Загрузить ещё»)', () => {
  it('дописывает новые элементы и не дублирует уже показанные', () => {
    const a = [{ id: '1' }, { id: '2' }];
    expect(mergeById(a, [{ id: '2' }, { id: '3' }]).map((x) => x.id)).toEqual(['1', '2', '3']);
  });
});

describe('splitLinks', () => {
  it('выделяет ссылки в тексте', () => {
    expect(splitLinks('Источник: https://gotov.org/news/x end')).toEqual([
      { text: 'Источник: ' },
      { text: 'https://gotov.org/news/x', href: 'https://gotov.org/news/x' },
      { text: ' end' },
    ]);
  });
});

describe('matchStaticPages', () => {
  it('находит статическую страницу по заголовку на текущем языке без учёта регистра', () => {
    const hits = matchStaticPages('ГАЛЕР', 'ru');
    expect(hits.map((h) => h.path)).toContain('/gallery');
  });
  it('ищет на английском и иврите', () => {
    expect(matchStaticPages('programs', 'en').map((h) => h.path)).toContain('/programs');
    expect(matchStaticPages('גלריה', 'he').map((h) => h.path)).toContain('/gallery');
  });
  it('короче двух символов — пусто', () => {
    expect(matchStaticPages('г', 'ru')).toEqual([]);
  });
});

describe('accumulate («Загрузить ещё»)', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  const c = { id: 'c' };
  it('следующая страница дописывается без дублей', () => {
    expect(accumulate([a, b], { page: 2, items: [b, c] })).toEqual([a, b, c]);
  });
  it('первая страница (смена языка, обновление) заменяет ленту', () => {
    expect(accumulate([a, b, c], { page: 1, items: [c] })).toEqual([c]);
  });
});
