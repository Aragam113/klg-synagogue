import {
  bodyWithoutTitle,
  extraSources,
  leadRepeatsBody,
  newsPhotos,
  sourceChannel,
} from './model';

describe('карточка новости из Telegram', () => {
  it('первая строка тела, повторяющая заголовок (с эмодзи по краям), не показывается второй раз', () => {
    const body = '👩‍🍳 Женский вечер в сукке\n\nВчера у нас прошла встреча.';
    expect(bodyWithoutTitle(body, 'Женский вечер в сукке')).toBe('Вчера у нас прошла встреча.');
  });

  it('первая строка, лишь начинающаяся с заголовка, остаётся', () => {
    const body = 'Суккот все ближе! Приходите строить сукку.\nВторая строка';
    expect(bodyWithoutTitle(body, 'Суккот все ближе!')).toBe(body);
  });

  it('тело без совпадения не меняется', () => {
    expect(bodyWithoutTitle('Текст поста', 'Заголовок')).toBe('Текст поста');
  });

  it('канал — из ссылки на пост', () => {
    expect(sourceChannel('https://t.me/B_C_Kaliningrad/1234')).toBe('B_C_Kaliningrad');
    expect(sourceChannel('https://example.org/x')).toBeNull();
    expect(sourceChannel(null)).toBeNull();
  });

  it('картинки поста → кадры лайтбокса; у каждого кадра ссылка на его пост', () => {
    expect(
      newsPhotos([
        { url: '/media/a.webp', width: 10, height: 5, postUrl: 'https://t.me/c/1' },
        { url: '/media/b.webp' },
      ])
    ).toEqual([
      {
        id: '/media/a.webp',
        file: '/media/a.webp',
        caption: null,
        credit: 'https://t.me/c/1',
        fallback: false,
      },
      { id: '/media/b.webp', file: '/media/b.webp', caption: null, credit: null, fallback: false },
    ]);
    expect(newsPhotos(undefined)).toEqual([]);
  });

  it('посты-источники приклеенных фото, кроме основного, без повторов', () => {
    const images = [
      { url: 'a', postUrl: 'https://t.me/c/1' },
      { url: 'b', postUrl: 'https://t.me/c/2' },
      { url: 'c', postUrl: 'https://t.me/c/2' },
    ];
    expect(extraSources(images, 'https://t.me/c/1')).toEqual(['https://t.me/c/2']);
    expect(extraSources(undefined, null)).toEqual([]);
  });

  it('лид не показывается, если тело начинается с тех же предложений', () => {
    const body =
      'Вчера у нас прошла встреча — «Мастер-шеф»! 🔥\n\nТе, кто успел, потрясли лулав. А потом готовка.';
    expect(
      leadRepeatsBody(
        'Вчера у нас прошла встреча — «Мастер-шеф»! Те, кто успел, потрясли лулав.',
        body
      )
    ).toBe(true);
    expect(
      leadRepeatsBody('Вчера у нас прошла встреча — «Мастер-шеф»! Те, кто успел, потря…', body)
    ).toBe(true);
    expect(leadRepeatsBody('Краткое описание события', body)).toBe(false);
    expect(leadRepeatsBody(null, body)).toBe(false);
  });
});
