import { postsToNews } from './telegram-news';
import type { TgPost } from './telegram-parser';

const SIGN = '💬 Бейт Хабад Калининград (https://t.me/B_C_Kaliningrad)';
const post = (
  id: number,
  date: string,
  text: string,
  images: string[]
): TgPost => ({
  id,
  url: `https://t.me/B_C_Kaliningrad/${id}`,
  date,
  text,
  images,
  hasVideo: false,
  hasAudio: false,
  forwardedFrom: null,
});

describe('postsToNews', () => {
  it('заголовок без эмодзи по краям, лид — следующие предложения, body дословно', () => {
    const text = `📜 Новый свиток Торы 📜\n\nСегодня праздник. Пришли все. И ещё.\n\n${SIGN}`;
    const {
      drafts: [n],
    } = postsToNews(
      [post(1, '2026-09-16T13:47:00+00:00', text, ['a'])],
      'B_C_Kaliningrad'
    );
    expect(n.title).toBe('Новый свиток Торы');
    expect(n.lead).toBe('Сегодня праздник. Пришли все.');
    expect(n.body).toBe(text);
  });

  it('пост только с картинками приклеивается к предыдущему посту того же дня, без соседа — в orphans', () => {
    const { drafts: news, orphans } = postsToNews(
      [
        post(11, '2026-09-16T15:22:00+00:00', SIGN, ['c', 'd']),
        post(10, '2026-09-16T14:18:00+00:00', `📜 Мы начинаем 📜\n\n${SIGN}`, [
          'a',
          'b',
        ]),
        post(5, '2026-09-15T08:00:00+00:00', '', ['z']),
      ],
      'B_C_Kaliningrad'
    );
    expect(news).toHaveLength(1);
    expect(news[0].parts).toEqual([
      { sourceUrl: 'https://t.me/B_C_Kaliningrad/10', imageUrls: ['a', 'b'] },
      { sourceUrl: 'https://t.me/B_C_Kaliningrad/11', imageUrls: ['c', 'd'] },
    ]);
    expect(news[0].lead).toBeNull();
    // фото 15 сентября без поста с текстом в выборке не теряется
    expect(orphans).toEqual([
      {
        sourceUrl: 'https://t.me/B_C_Kaliningrad/5',
        publishedAt: new Date('2026-09-15T08:00:00+00:00'),
        imageUrls: ['z'],
      },
    ]);
  });
});
