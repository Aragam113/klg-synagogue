import {
  bodyWithoutTitle,
  extraSources,
  leadRepeatsBody,
  newsPhotos,
  backToList,
  cleanTitle,
  coverFrame,
  moreNews,
  postGallery,
  readingMinutes,
  shareLinks,
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

describe('страница новости: подача', () => {
  it('заголовок без голых ссылок из Telegram', () => {
    expect(cleanTitle('Открытие сезона в EnerJew (https://t.me/enerjew)')).toBe(
      'Открытие сезона в EnerJew'
    );
    expect(cleanTitle('Смотри https://example.org — анонс')).toBe('Смотри — анонс');
    expect(cleanTitle('Просто заголовок')).toBe('Просто заголовок');
  });

  it('время чтения: ~180 слов в минуту, не меньше минуты', () => {
    expect(readingMinutes('слово '.repeat(360))).toBe(2);
    expect(readingMinutes('слово '.repeat(361))).toBe(3);
    expect(readingMinutes('')).toBe(1);
  });

  it('кадры: обложка первой, галерея — остальные; одно фото — без галереи', () => {
    const imgs = [{ url: '/media/a.webp' }, { url: '/media/b.webp' }, { url: '/media/c.webp' }];
    const g = postGallery(imgs, '/media/a.webp');
    expect(g.photos.map((p) => p.file)).toEqual([
      '/media/a.webp',
      '/media/b.webp',
      '/media/c.webp',
    ]);
    expect(g.gallery.map((x) => [x.photo.file, x.index])).toEqual([
      ['/media/b.webp', 1],
      ['/media/c.webp', 2],
    ]);
    const one = postGallery([{ url: '/media/a.webp' }], '/media/a.webp');
    expect(one.photos).toHaveLength(1);
    expect(one.gallery).toEqual([]);
    // обложка из сидов, которой нет среди картинок поста, — тоже кадр лайтбокса
    const seeded = postGallery([], '/media/cover.webp');
    expect(seeded.photos.map((p) => p.file)).toEqual(['/media/cover.webp']);
    expect(postGallery(undefined, null)).toEqual({ photos: [], gallery: [] });
  });

  it('ссылки «Поделиться»: Telegram, WhatsApp, VK с адресом и заголовком', () => {
    const s = shareLinks('https://site.ru/news/x?lang=ru', 'Ханука & свечи');
    expect(s.telegram).toBe(
      'https://t.me/share/url?url=https%3A%2F%2Fsite.ru%2Fnews%2Fx%3Flang%3Dru&text=%D0%A5%D0%B0%D0%BD%D1%83%D0%BA%D0%B0%20%26%20%D1%81%D0%B2%D0%B5%D1%87%D0%B8'
    );
    expect(s.whatsapp).toBe(
      'https://wa.me/?text=%D0%A5%D0%B0%D0%BD%D1%83%D0%BA%D0%B0%20%26%20%D1%81%D0%B2%D0%B5%D1%87%D0%B8%20https%3A%2F%2Fsite.ru%2Fnews%2Fx%3Flang%3Dru'
    );
    expect(s.vk).toBe(
      'https://vk.com/share.php?url=https%3A%2F%2Fsite.ru%2Fnews%2Fx%3Flang%3Dru&title=%D0%A5%D0%B0%D0%BD%D1%83%D0%BA%D0%B0%20%26%20%D1%81%D0%B2%D0%B5%D1%87%D0%B8'
    );
  });

  it('«Все новости» ведёт на ту же страницу ленты и к той же карточке', () => {
    expect(backToList(3, 'khanuka')).toBe('/news?pages=3&from=khanuka');
    expect(backToList(1, 'khanuka')).toBe('/news?from=khanuka');
    expect(backToList(null, 'a b')).toBe('/news?from=a%20b');
  });

  it('«Ещё новости»: три, без текущей и без соседей', () => {
    const it = (slug: string) => ({ slug }) as { slug: string };
    const list = ['a', 'b', 'c', 'd', 'e', 'f'].map(it);
    expect(moreNews(list, 'b', ['a', 'c']).map((n) => n.slug)).toEqual(['d', 'e', 'f']);
    expect(moreNews(list.slice(0, 2), 'a', []).map((n) => n.slug)).toEqual(['b']);
  });
});

describe('рамка обложки', () => {
  it('широкий кадр — свои пропорции в пределах 4:3…2:1, заполняет рамку', () => {
    expect(coverFrame(1600, 900)).toEqual({ ratio: 1600 / 900, fit: 'cover' });
    expect(coverFrame(3000, 1000)).toEqual({ ratio: 2, fit: 'cover' });
  });
  it('вертикальный или квадратный — рамка 3:2, кадр целиком на размытом фоне', () => {
    expect(coverFrame(900, 1600)).toEqual({ ratio: 1.5, fit: 'contain' });
    expect(coverFrame(1000, 1000)).toEqual({ ratio: 1.5, fit: 'contain' });
  });
  it('размеры неизвестны — 3:2, заполняет', () => {
    expect(coverFrame(undefined, undefined)).toEqual({ ratio: 1.5, fit: 'cover' });
  });
});
