/** Smoke the exported demo (no backend): three languages, desktop/mobile, forms, search and metadata. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import puppeteer from 'puppeteer-core';

const origin = process.env.WEB_URL || 'http://localhost:8231';
const base = (process.env.WEB_PATH || '/klg-synagogue').replace(/\/$/, '');
const shots = process.env.SMOKE_SHOTS;
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
});
const errors = [];
let visited = 0;
const routes = [
  '/',
  '/about',
  '/contacts',
  '/departments',
  '/programs',
  '/news',
  '/news/telegram-2428',
  '/news/zhenskiy-vecher-v-sukke-2',
  '/events',
  '/events/demo-koncert',
  '/fundraisers',
  '/fundraisers/demo-prazdnichnye-nabory',
  '/donate',
  '/schedule',
  '/visit',
  '/visit/hours',
  '/visit/excursions',
  '/visit/excursions/book',
  '/ask-rabbi',
  '/appointment',
  '/help',
  '/volunteer',
  '/prayers/misheberah',
  '/privacy',
  '/consent',
  '/search',
];
if (shots) await mkdir(shots, { recursive: true });
try {
  for (const lang of ['ru', 'en', 'he'])
    for (const width of [1440, 390]) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width, height: 900, isMobile: width < 600, hasTouch: width < 600 });
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      page.on('pageerror', (error) => errors.push(lang + '/' + width + ': ' + error.message));
      page.on('request', (request) => {
        if (!['GET', 'HEAD'].includes(request.method()))
          errors.push('Unexpected submission: ' + request.method() + ' ' + request.url());
      });
      for (const route of routes) {
        const url = origin + base + (route === '/' ? '/' : route) + '?lang=' + lang;
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(
          (expected) =>
            document.querySelector('h1')?.textContent.trim() &&
            document.documentElement.lang === expected,
          { timeout: 20000 },
          lang
        );
        await page.waitForNetworkIdle({ idleTime: 150, timeout: 12000 }).catch(() => {});
        const info = await page.evaluate(
          (basePath) => ({
            h1: document.querySelector('h1')?.textContent,
            lang: document.documentElement.lang,
            dir: document.documentElement.dir,
            overflow: document.documentElement.scrollWidth - innerWidth,
            placeholders: document.body.innerText.includes('[ВПИШИ:'),
            description: [...document.querySelectorAll('meta[name="description"]')].map(
              (m) => m.content
            ),
            ogTitles: [...document.querySelectorAll('meta[property="og:title"]')].map(
              (m) => m.content
            ),
            canonical: document.querySelector('link[rel="canonical"]')?.href,
            title: document.title,
            forms: [...document.querySelectorAll('form.form')].map((f) => ({
              notice: !!f.querySelector('[data-demo-notice]'),
              disabled: [...f.querySelectorAll('button[type="submit"]')].every((b) => b.disabled),
            })),
            outsideLinks: [...document.querySelectorAll('a[href]')]
              .filter(
                (a) =>
                  a.origin === location.origin &&
                  a.pathname !== basePath &&
                  !a.pathname.startsWith(basePath + '/')
              )
              .map((a) => a.href),
          }),
          base
        );
        assert(
          !['Страница не найдена', 'Page not found', 'הדף לא נמצא'].includes(info.h1),
          url + ': not found'
        );
        assert.equal(info.dir, lang === 'he' ? 'rtl' : 'ltr', url + ': direction');
        assert(info.overflow <= 1, url + ': horizontal overflow ' + info.overflow);
        assert(!info.placeholders, url + ': editorial placeholder');
        assert.equal(info.description.length, 1, url + ': duplicate descriptions');
        assert(info.description[0]?.length > 20, url + ': missing description');
        assert.deepEqual(info.ogTitles, [info.title], url + ': stale share title');
        assert(info.canonical.includes(base), url + ': canonical base');
        assert(
          info.forms.every((f) => f.notice && f.disabled),
          url + ': demo form notice/submit'
        );
        assert.equal(info.outsideLinks.length, 0, url + ': link lost base URL');
        if (route === '/search') {
          const button = await page.$('form[role="search"] button[type="submit"]');
          assert.equal(
            await button.evaluate((el) => el.disabled),
            false,
            'search must remain enabled'
          );
          await page.type('#site-search', { ru: 'синагога', en: 'synagogue', he: 'בית' }[lang]);
          await button.click();
          await page.waitForSelector('[data-testid="search-hits"] a', { timeout: 10000 });
        }
        if (route === '/ask-rabbi') {
          await page.$eval('main form.form', (form) => form.requestSubmit());
          assert.equal(
            await page.$('main [role="alert"]'),
            null,
            'demo submission should remain inactive'
          );
        }
        if (route === '/about' && width < 600) {
          await page.click('.hdr__burger');
          await page.waitForFunction(() => !!document.activeElement?.closest('#mnav'));
          for (let n = 0; n < 20; n++) {
            await page.keyboard.press('Tab');
            assert(
              await page.evaluate(() => !!document.activeElement?.closest('#mnav')),
              'focus escaped mobile menu'
            );
          }
          await page.keyboard.press('Escape');
          await page.waitForFunction(() =>
            document.activeElement?.classList.contains('hdr__burger')
          );
        }
        if (
          shots &&
          ['/about', '/ask-rabbi', '/news/telegram-2428'].includes(route) &&
          (lang === 'ru' || lang === 'he')
        )
          await page.screenshot({
            path: path.join(shots, lang + '-' + width + '-' + route.replaceAll('/', '-') + '.png'),
          });
        visited++;
      }
      console.log(lang + ' ' + width + ': ' + routes.length + ' pages passed');
      await context.close();
    }
  // These deep links must return their own metadata even to a crawler without JavaScript.
  for (const route of ['/about', '/news/telegram-2428', '/events/demo-koncert']) {
    const response = await fetch(origin + base + route);
    assert.equal(response.status, 200, route + ': deep link status');
    const html = await response.text();
    assert.match(html, /property="og:title"/);
    assert.match(html, /name="description"/);
    assert.match(html, /name="robots" content="noindex,follow"/);
    assert(!html.includes('%WEB_TITLE%'), route + ': template title');
  }
  assert.deepEqual(errors, [], 'browser errors or unexpected submissions');
  console.log(
    'Demo smoke passed: ' + visited + ' pages, zero submissions, static previews verified.'
  );
} finally {
  await browser.close();
}
