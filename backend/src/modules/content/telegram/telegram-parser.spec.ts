import { readFileSync } from 'fs';
import { resolve } from 'path';
import { htmlToText, parseChannelPage } from './telegram-parser';

// Фикстуры — реальные страницы https://t.me/s/B_C_Kaliningrad, снятые 2026-10-01.
const fixture = (name: string) =>
  readFileSync(
    resolve(__dirname, '../../../../test/fixtures/telegram', name),
    'utf8'
  );

describe('parseChannelPage — веб-версия Telegram-канала', () => {
  const latest = parseChannelPage(fixture('page-2026-10-01.html'));

  it('альбом — один пост со всеми картинками группы; видео даёт превью и пометку', () => {
    const post = latest.posts.find((p) => p.id === 2244)!;
    expect(post.url).toBe('https://t.me/B_C_Kaliningrad/2244');
    // 1 превью видео + 9 фото, в порядке раскладки поста
    expect(post.images).toHaveLength(10);
    expect(post.images[0]).toMatch(
      /^https:\/\/cdn4\.telesco\.pe\/file\/PtSB0vGtXC0KojytRsfXVvGbR4UTw/
    );
    expect(post.images[1]).toMatch(
      /^https:\/\/cdn4\.telesco\.pe\/file\/GYHvaMW1Rl-UWSgLLPHoXmbZgy8ib/
    );
    expect(post.hasVideo).toBe(true);
    const album = latest.posts.find((p) => p.id === 2264)!;
    expect(album.images).toHaveLength(10);
    expect(album.hasVideo).toBe(false);
  });

  it('дата поста и текст с переносами, эмодзи и сущностями', () => {
    const post = latest.posts.find((p) => p.id === 2244)!;
    expect(post.date).toBe('2026-09-30T20:01:28+00:00');
    expect(
      post.text.startsWith(
        '❤️ Праздник в сукке для старшего поколения \n\nСегодня мы праздновали'
      )
    ).toBe(true);
    expect(post.text).toContain('отмечать вместе праздники — бесценно!\n\n');
    // ссылка с текстом сохраняет адрес
    expect(post.text).toContain(
      'Бейт Хабад Калининград (https://t.me/B_C_Kaliningrad)'
    );
    expect(post.text).not.toMatch(/<|&#/);
  });

  it('пагинация: before — самый ранний пост страницы', () => {
    expect(latest.posts.map((p) => p.id)).toEqual([2244, 2264]);
    expect(latest.before).toBe(2244);
  });

  it('репост помечен источником, текст цитаты-ответа не попадает в пост', () => {
    const page = parseChannelPage(fixture('page-before-2203.html'));
    const fwd = page.posts.find((p) => p.forwardedFrom);
    expect(fwd?.forwardedFrom).toEqual({
      name: 'Раввин Авраам Борух Дайч',
      url: 'https://t.me/rabbikaliningrad/43',
    });
    expect(fwd?.hasVideo).toBe(true);

    const replyPage = parseChannelPage(fixture('page-before-2055.html'));
    const reply = replyPage.posts.find((p) => p.id === 2035)!;
    expect(
      reply.text.startsWith('Больше ярких кадров с открытия сезона 🔥\n\n')
    ).toBe(true);
    expect(reply.text).not.toContain('Открытие сезона в EnerJew');
  });

  it('ссылка без букв и цифр в тексте (эмодзи) не разворачивается в «текст (url)»', () => {
    expect(
      htmlToText(
        '<a href="https://t.me/B_C_Kaliningrad">💬</a> Бейт Хабад Калининград'
      )
    ).toBe('💬 Бейт Хабад Калининград');
  });

  it('HTML-сущности декодируются ровно один раз — и в тексте, и в ссылках', () => {
    const html =
      'Код &amp;lt;b&amp;gt; &lt;i&gt;<br/>' +
      '<a href="https://ex.org/?a=1&amp;amp;b=2">тег &amp;lt;br&amp;gt;</a>';
    expect(htmlToText(html)).toBe(
      'Код &lt;b&gt; <i>\nтег &lt;br&gt; (https://ex.org/?a=1&amp;b=2)'
    );
  });
});
