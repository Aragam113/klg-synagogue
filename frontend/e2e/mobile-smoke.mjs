/**
 * Mobile smoke (task 12): phones 360/390/414 (isMobile + hasTouch), ru and he.
 *
 *   npm run smoke:mobile        (WEB_URL=http://localhost:8150 by default; starts Expo there if it is down)
 *   SHOT_PREFIX=m12_after       screenshot name prefix (e2e/shots/<prefix>_*.png)
 *
 * Checks: side margins ≥ 16px in every home section at 360; the logo does not overlap the header icons;
 * the mobile menu is above the cookie banner; touch targets ≥ 44px (header icons, burger, menu languages,
 * close, checkbox label); the marquee moves; Reveal fires on scroll; the community chapters ribbon swipes
 * (scroll-snap, dots follow); the scene credit is one short line; with reduced motion nothing moves.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const WEB = process.env.WEB_URL ?? 'http://localhost:8150';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.env.SMOKE_SHOTS ?? join(ROOT, 'e2e', 'shots');
const PREFIX = process.env.SHOT_PREFIX ?? 'm12_after';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(SHOTS, { recursive: true });

const SECTIONS = ['#hero', '.scrub', '#welcome', '#today', '#community', '#ledger', '.home-marquee', '#visit', '#events', '#funds', '#news', '#dawn'];

const failures = [];
const check = (ok, what, extra = '') => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${what}${extra ? ` (${extra})` : ''}`);
  if (!ok) failures.push(what);
};

const up = async () => {
  try {
    return (await fetch(WEB)).ok;
  } catch {
    return false;
  }
};
let server = null;
if (!(await up())) {
  console.log(`starting expo web on ${WEB} ...`);
  server = spawn('npx', ['expo', 'start', '--web', '--port', new URL(WEB).port], {
    cwd: ROOT,
    shell: true,
    env: { ...process.env, CI: '1', BROWSER: 'none' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 180 && !(await up()); i++) await sleep(1000);
}
const stopServer = () => {
  if (!server) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else server.kill('SIGTERM');
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--font-render-hinting=none'],
});

const open = async (path, width, { reduced = false, cookie = true } = {}) => {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 800, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument((c) => {
    localStorage.setItem('synagogue.preloaded', '1');
    if (c) localStorage.setItem('synagogue.cookieConsent', '1');
    else localStorage.removeItem('synagogue.cookieConsent');
  }, cookie);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }]);
  await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForSelector('.hdr', { timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector('[data-preloader]'), { timeout: 8000 }).catch(() => undefined);
  await sleep(600);
  return page;
};
const scrollTo = (page, y) => page.evaluate((v) => window.scrollTo(0, v), y);
const shot = (page, name, full = false) => page.screenshot({ path: join(SHOTS, `${PREFIX}_${name}.png`), fullPage: full });

/** Elements of a section that stick out of the 16px side fields (horizontal tracks are measured as a whole). */
const marginViolations = (page) =>
  page.evaluate((sels) => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    const scroller = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll' || p.classList.contains('marquee')) return true;
      }
      return false;
    };
    for (const s of sels) {
      const sec = document.querySelector(s);
      if (!sec) {
        out.push(`${s}: missing`);
        continue;
      }
      const els = sec.querySelectorAll('h1,h2,h3,p,a.btn,button,.home-tile,.home-vcard,.card,.eyebrow,.ph,.arch-wrap,[data-ribbon]');
      for (const el of els) {
        let r = el.getBoundingClientRect();
        if (el.hasAttribute('data-ribbon') && el.firstElementChild) {
          // a full-bleed ribbon: its slides carry the side fields as padding — measure the slide's content box
          const c = el.firstElementChild;
          const cs = getComputedStyle(c);
          const b = c.getBoundingClientRect();
          r = { left: b.left + parseFloat(cs.paddingLeft), right: b.right - parseFloat(cs.paddingRight), width: b.width, height: b.height };
        }
        if (!r.width || !r.height || scroller(el)) continue;
        if (getComputedStyle(el).visibility === 'hidden') continue;
        if (r.left < 15.5 || r.right > vw - 15.5)
          out.push(`${s} ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} [${Math.round(r.left)}..${Math.round(r.right)}]`);
      }
    }
    return out;
  }, SECTIONS);

try {
  // ---- 1. margins, header, credit: 360/390/414 × ru/he
  for (const lang of ['ru', 'he']) {
    for (const w of [360, 390, 414]) {
      const page = await open(`/?lang=${lang}`, w);
      const tag = `${w} ${lang}`;
      const hdr = await page.evaluate(() => {
        const a = document.querySelector('.hdr .logo__text').getBoundingClientRect();
        const bad = [];
        for (const t of document.querySelectorAll('.hdr__tools > *')) {
          const b = t.getBoundingClientRect();
          if (!b.width) continue;
          if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) bad.push(t.className);
        }
        const sizes = [...document.querySelectorAll('.hdr__icon, .hdr__burger')]
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.width)
          .map((r) => `${Math.round(r.width)}x${Math.round(r.height)}`);
        return { bad, sizes };
      });
      check(hdr.bad.length === 0, `${tag}: logo clear of header icons`, hdr.bad.join(','));
      check(hdr.sizes.every((s) => s.split('x').every((v) => +v >= 44)), `${tag}: header targets ≥ 44px`, hdr.sizes.join(' '));
      check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${tag}: no horizontal scroll`);
      if (w === 360 || lang === 'ru') {
        const bad = await marginViolations(page);
        check(bad.length === 0, `${tag}: side margins ≥ 16px in all home sections`, bad.slice(0, 4).join(' | '));
      }
      const credit = await page.evaluate(() => {
        const c = document.querySelector('.scrub__credits');
        if (!c) return null;
        const lh = parseFloat(getComputedStyle(c).lineHeight) || 16;
        return { lines: Math.round(c.getBoundingClientRect().height / lh), text: c.textContent };
      });
      check(!!credit && credit.lines <= 1 && !/лиценз|license|רישיון/i.test(credit.text), `${tag}: scene credit is one short line`, JSON.stringify(credit));
      if (w === 390 || (w === 360 && lang === 'he')) {
        await shot(page, `home_${w}_${lang}_top`);
        await shot(page, `home_${w}_${lang}_full`, true);
      }
      await page.close();
    }
  }

  // ---- 2. menu above the cookie banner, menu targets
  for (const lang of ['ru', 'he']) {
    const page = await open(`/?lang=${lang}`, 360, { cookie: false });
    const ck = await page.evaluate(() => Math.round(document.querySelector('.cookie')?.getBoundingClientRect().height ?? 0));
    check(ck > 0 && ck <= 120, `${lang}: cookie banner compact on 360`, `${ck}px`);
    await page.click('.hdr__burger');
    await sleep(900);
    const menu = await page.evaluate(() => {
      const res = [];
      for (const b of document.querySelectorAll('.mnav .lang__btn')) {
        const r = b.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        res.push({ ok: !!hit && b.contains(hit), h: Math.round(r.height), w: Math.round(r.width) });
      }
      const close = document.querySelector('.mnav__close').getBoundingClientRect();
      return { res, close: Math.round(close.height) };
    });
    check(menu.res.length === 3 && menu.res.every((x) => x.ok), `${lang}: menu languages above the cookie banner`, JSON.stringify(menu.res));
    check(menu.res.every((x) => x.h >= 44 && x.w >= 44) && menu.close >= 44, `${lang}: menu targets ≥ 44px`, JSON.stringify(menu));
    await shot(page, `menu_360_${lang}`);
    await page.close();
  }

  // ---- 2b. visible [ВПИШИ] placeholders stay inside their card on he
  for (const path of ['/donate?lang=he', '/visit/how-to-get?lang=he']) {
    const page = await open(path, 360);
    const out = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      return [...document.querySelectorAll('.ph')]
        .map((e) => e.getBoundingClientRect())
        .filter((r) => r.width && (r.left < 16 || r.right > vw - 16))
        .map((r) => `${Math.round(r.left)}..${Math.round(r.right)}`);
    });
    check(out.length === 0, `360 ${path}: placeholders inside the card`, out.join(' '));
    await page.close();
  }

  // ---- 3. checkbox hit area
  {
    const page = await open('/ask-rabbi', 360);
    const h = await page.evaluate(() => {
      const l = document.querySelector('label.check');
      return l ? Math.round(l.getBoundingClientRect().height) : 0;
    });
    check(h >= 44, '360: checkbox label hit area ≥ 44px', String(h));
    await page.close();
  }

  // ---- 4. motion on a phone: marquee, reveal, chapters ribbon
  {
    const page = await open('/?lang=ru', 390);
    check(await page.evaluate(() => document.documentElement.dataset.motion !== 'on'), '390: no scroll-scrub on touch');
    const ty = () =>
      page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.home-marquee .marquee__track')).transform).m41);
    await page.evaluate(() => document.querySelector('.home-marquee').scrollIntoView({ block: 'center' }));
    const a = await ty();
    await sleep(1200);
    const b = await ty();
    check(Math.abs(a - b) > 3, '390: marquee moves', `${a} → ${b}`);
    // G11: the phone marquee looks like the desktop one — flat, on the section background, not a gold tilted band
    const look = await page.evaluate(() => {
      const m = document.querySelector('.home-marquee .marquee');
      const cs = getComputedStyle(m);
      return { rotate: cs.rotate, bg: cs.backgroundColor, w: Math.round(m.getBoundingClientRect().width), vw: innerWidth };
    });
    check(look.rotate === 'none' && look.bg === 'rgba(0, 0, 0, 0)' && look.w <= look.vw, '390: marquee is flat, no gold band', JSON.stringify(look));

    await scrollTo(page, 0);
    await sleep(300);
    const before = await page.evaluate(() => {
      const el = document.querySelector('#visit .reveal');
      return { rev: el.dataset.revealed ?? null, op: getComputedStyle(el).opacity };
    });
    check(before.rev !== 'true' && +before.op < 1, '390: Reveal waits below the fold', JSON.stringify(before));
    await page.evaluate(() => document.querySelector('#visit .reveal').scrollIntoView({ block: 'center' }));
    await sleep(1400);
    const after = await page.evaluate(() => {
      const el = document.querySelector('#visit .reveal');
      return { rev: el.dataset.revealed ?? null, op: getComputedStyle(el).opacity };
    });
    check(after.rev === 'true' && +after.op > 0.99, '390: Reveal fires on scroll', JSON.stringify(after));

    const scene = await page.evaluate(() => {
      const t = document.querySelector('.scrub [data-ribbon]');
      return t ? { sw: t.scrollWidth, cw: t.clientWidth, dots: document.querySelectorAll('.scrub .pinned__dot').length } : null;
    });
    check(!!scene && scene.sw > scene.cw * 1.5 && scene.dots === 4, '390: scene chapters are a swipe ribbon with dots', JSON.stringify(scene));

    await page.evaluate(() => document.querySelector('#community').scrollIntoView({ block: 'start' }));
    await sleep(500);
    await shot(page, 'community_390_ru');
    const rib = await page.evaluate(() => {
      const t = document.querySelector('#community [data-ribbon]');
      if (!t) return null;
      const dots = document.querySelectorAll('#community .pinned__dot');
      return { snap: getComputedStyle(t).scrollSnapType, sw: t.scrollWidth, cw: t.clientWidth, dots: dots.length, active: document.querySelector('#community .pinned').dataset.active };
    });
    check(!!rib && rib.sw > rib.cw * 1.5 && rib.snap.includes('x') && rib.dots === 4 && rib.active === '0', '390: community chapters are a swipe ribbon with dots', JSON.stringify(rib));
    if (rib) {
      await page.evaluate(() => {
        const t = document.querySelector('#community [data-ribbon]');
        t.scrollTo({ left: t.clientWidth * 1.02, behavior: 'instant' });
      });
      await sleep(700);
      const act = await page.evaluate(() => ({
        active: document.querySelector('#community .pinned').dataset.active,
        dot: [...document.querySelectorAll('#community .pinned__dot')].findIndex((d) => d.getAttribute('aria-current') === 'true'),
      }));
      check(act.active === '1' && act.dot === 1, '390: swiping the ribbon moves the dots', JSON.stringify(act));
      await shot(page, 'community_390_ru_swiped');
    }
    await page.close();
  }

  // ---- 5. reduced motion: nothing moves, everything visible
  {
    const page = await open('/?lang=ru', 390, { reduced: true });
    const st = await page.evaluate(() => {
      const el = document.querySelector('#visit .reveal');
      return { op: getComputedStyle(el).opacity, anim: getComputedStyle(document.querySelector('.home-marquee .marquee__track')).animationName };
    });
    check(+st.op === 1 && st.anim === 'none', '390 reduced: static and visible', JSON.stringify(st));
    await page.close();
  }

  // ---- 6. tablet + he snapshots
  {
    const page = await open('/?lang=he', 768);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), '768 he: no horizontal scroll');
    const bad = await marginViolations(page);
    check(bad.length === 0, '768 he: side margins ≥ 16px', bad.slice(0, 4).join(' | '));
    await shot(page, 'home_768_he_full', true);
    await page.close();
  }
} catch (e) {
  check(false, `smoke crashed: ${e?.message ?? e}`);
} finally {
  await browser.close();
  stopServer();
}

console.log(failures.length ? `\n${failures.length} FAILED` : '\nmobile smoke: all green');
process.exit(failures.length ? 1 : 0);
