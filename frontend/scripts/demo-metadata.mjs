import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Route-specific HTML heads let link previews work without executing the SPA. */
export async function writeDemoMetadata(root, dist, base) {
  const json = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
  const pages = await json('src/config/page-metadata.json');
  const common = await json('src/i18n/locales/ru/common.json');
  const origin = (process.env.EXPO_PUBLIC_SITE_ORIGIN || 'https://aragam113.github.io').replace(
    /\/+$/,
    ''
  );
  const absolute = (url) => (/^https?:\/\//.test(url) ? url : origin + base + url);
  const escape = (text) =>
    String(text).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const shell = (await readFile(path.join(dist, 'index.html'), 'utf8')).replace(
    /<title>.*?<\/title>/s,
    ''
  );
  const routes = new Map(
    pages.map((page) => [page.path, { title: page.title.ru, description: page.description.ru }])
  );
  routes.set('/', { title: '', description: common.demo.description });
  for (const [route, title] of Object.entries({
    '/ask-rabbi': 'Вопрос раввину',
    '/appointment': 'Запись на приём',
    '/visit/excursions/book': 'Запись на экскурсию',
    '/help': 'Обратиться за помощью',
    '/volunteer': 'Стать волонтёром',
    '/donate': 'Поддержать общину',
    '/fundraisers': 'Сборы',
    '/search': 'Поиск по сайту',
    '/holidays': 'Еврейские праздники',
    '/prayers': 'Заказать молитву',
  }))
    routes.set(route, { title, description: common.demo.description });
  for (const kind of ['news', 'events', 'fundraisers', 'albums']) {
    const rows = await json(`public/demo-data/ru/${kind}.json`);
    const route = kind === 'albums' ? 'gallery' : kind;
    for (const row of rows)
      routes.set('/' + route + '/' + row.slug, {
        title: row.title,
        description: row.lead || row.description || row.body || common.demo.description,
        image: row.cover,
        article: kind === 'news',
      });
  }
  for (const [route, page] of routes) {
    const title = page.title
      ? page.title + ' — Новая синагога, Калининград'
      : 'Новая синагога, Калининград — демо';
    const description = page.description.replace(/\s+/g, ' ').trim().slice(0, 240);
    const url = absolute(route);
    const image = absolute(page.image || '/media/share-preview.jpg');
    const meta = (name, content, property = false) =>
      '<meta ' +
      (property ? 'property' : 'name') +
      '="' +
      name +
      '" content="' +
      escape(content) +
      '" data-rh="true" />';
    const head =
      '<title data-rh="true">' +
      escape(title) +
      '</title>' +
      [
        meta('description', description),
        meta('robots', 'noindex,follow'),
        meta('og:title', title, true),
        meta('og:description', description, true),
        meta('og:url', url, true),
        meta('og:type', page.article ? 'article' : 'website', true),
        meta('og:locale', 'ru_RU', true),
        meta('og:image', image, true),
        meta('og:image:alt', page.title || 'Новая синагога, Калининград', true),
        meta('twitter:card', 'summary_large_image'),
        meta('twitter:title', title),
        meta('twitter:description', description),
        meta('twitter:image', image),
      ].join('') +
      '<link rel="canonical" href="' +
      escape(url) +
      '" data-rh="true" />';
    const dir = path.join(dist, route.replace(/^\//, ''));
    const relative = path.relative(dist, dir);
    if (relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error('Invalid snapshot route: ' + route);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, 'index.html'),
      shell.replace('</head>', head + '</head>').replace(/<html lang="[^"]*"/, '<html lang="ru"')
    );
  }
  await writeFile(path.join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  console.log('demo: route metadata for ' + routes.size + ' pages (demo is noindex)');
}
