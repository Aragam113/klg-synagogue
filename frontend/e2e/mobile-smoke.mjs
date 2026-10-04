/**
 * Mobile smoke: phones 360/390/414 (isMobile + hasTouch), ru and he.
 *
 *   npm run smoke:mobile        (WEB_URL=http://localhost:8150 by default; starts Expo there if it is down)
 *   SHOT_PREFIX=m12_after       screenshot name prefix (e2e/shots/<prefix>_*.png)
 *
 * Checks: side margins ≥ 16px in every home section at 360; the logo does not overlap the header icons;
 * the mobile menu is above the cookie banner; touch targets ≥ 44px (header icons, burger, menu languages,
 * close, checkbox label); the marquee moves; Reveal fires on scroll; «Жизнь общины» is pinned on touch too
 * in both phone layouts `?life=1|2` (1 full-screen photo, 2 big arch; no parameter = 1): chapters change by scroll
 * down and up, the photo follows, stories progress, the big title shrinks, nothing overlaps at 360/390/414 and he
 * (life_v{1,2}_*); reduced motion — a static column with a full-width photo per chapter;
 * the scene credit is one short line; with reduced motion nothing moves.
 * On touch the synagogue scene scrubs by native scroll (frame at p≈0.1 ≠ p≈0.9 and back,
 * sticky 100svh), the Dawn rosette turns by itself (two marks 3 s apart) and with scroll, the hexagram
 * background parallaxes — at 390×844 and 360×740; shots e2e/shots/g12_*.
 * Touch path (390×844): no Lenis, sticky in fixed px (the address bar does not move it), the sharp light set,
 * crossfaded frames; auto-settle — a drag stopped mid-chapter glides to the chapter stop (m2_snap_before/after),
 * a touch cancels the glide, nothing is pulled outside the scene. Desktop keeps the full set.
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
const PREFIX = process.env.SHOT_PREFIX ?? 'm3';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(SHOTS, { recursive: true });

const SECTIONS = ['#hero', '.scrub', '#welcome', '#today', '#community', '#ledger', '.home-marquee', '#visit', '#events', '#funds', '#news', '#dawn'];

const ONLY = process.env.G12_ONLY === '1'; // touch-scene checks only (4b, 5)
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

const open = async (path, width, { reduced = false, cookie = true, height = 800 } = {}) => {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
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
const shotG = (page, name) => page.screenshot({ path: join(SHOTS, `g12_${name}.png`) });

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
  if (!ONLY) for (const lang of ['ru', 'he']) {
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
  if (!ONLY) for (const lang of ['ru', 'he']) {
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
  if (!ONLY) for (const path of ['/donate?lang=he', '/visit/how-to-get?lang=he']) {
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
  if (!ONLY) {
    const page = await open('/ask-rabbi', 360);
    const h = await page.evaluate(() => {
      const l = document.querySelector('label.check');
      return l ? Math.round(l.getBoundingClientRect().height) : 0;
    });
    check(h >= 44, '360: checkbox label hit area ≥ 44px', String(h));
    await page.close();
  }

  // ---- 4. motion on a phone: marquee, reveal
  if (!ONLY) {
    const page = await open('/?lang=ru', 390);
    check(await page.evaluate(() => document.documentElement.dataset.motion === 'on'), '390: scroll-driven motion on touch');
    const ty = () =>
      page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.home-marquee .marquee__track')).transform).m41);
    await page.evaluate(() => document.querySelector('.home-marquee').scrollIntoView({ block: 'center' }));
    const a = await ty();
    await sleep(1200);
    const b = await ty();
    check(Math.abs(a - b) > 3, '390: marquee moves', `${a} → ${b}`);
    // The phone marquee looks like the desktop one — flat, on the section background, not a gold tilted band
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


    await page.close();
  }

  // ---- 4a. «Жизнь общины» on a phone: pinned chapters (touch path) in both `?life=` layouts —
  //      1 full-screen photo, 2 big arch; 390×844 (shots life_v{1,2}_ch1..4_390), 360×740, 414×896, he
  /** Chapter stops of the auto-settle (touch-scroll chapterStops for 4): entry, 1.45/4, 2.45/4, end. */
  const STOPS = [0, 1.45 / 4, 2.45 / 4, 1];
  const over = (a, b) => a && b && a.t < b.b - 1 && b.t < a.b - 1 && a.l < b.r - 1 && b.l < a.r - 1;
  const lifeRun = async (v, w, h, lang, { shots = [], deep = false } = {}) => {
    const page = await open(`/?lang=${lang}${v ? `&life=${v}` : ''}`, w, { height: h });
    const life = v ?? 1;
    const tag = `life ${life} ${w}×${h} ${lang}`;
    const geo = await page.evaluate(() => {
      const el = document.querySelector('#community .pinned');
      return {
        top: el.getBoundingClientRect().top + scrollY,
        h: el.offsetHeight,
        n: +getComputedStyle(el).getPropertyValue('--chapters'),
        cls: document.querySelector('#community').className,
      };
    });
    check(geo.n === 4 && geo.h === h * 5 && geo.cls.includes(`home-community--life${life}`) &&
      !(await page.evaluate(() => !!document.querySelector('#community [data-ribbon], #community .pinned__dot'))),
      `${tag}: pinned runway in fixed px (--vh-fix × (4+1)), layout class, no swipe ribbon`, JSON.stringify(geo));
    const runway = geo.h - h;
    const at = async (i, frac = STOPS[i]) => {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(geo.top + runway * frac));
      await sleep(1300);
      return page.evaluate(() => {
        const root = document.querySelector('#community .pinned');
        const sticky = root.querySelector('.pinned__sticky').getBoundingClientRect();
        const cur = root.querySelector('.pinned__chapter[data-current="true"]');
        const box = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return null;
          return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) };
        };
        const parts = cur
          ? [...cur.querySelectorAll('.home-chapter__n, h3, p, .btn')].filter((e) => getComputedStyle(e).display !== 'none').map(box)
          : [];
        const photos = [...root.querySelectorAll('.home-life__photo')].map((p) => +getComputedStyle(p).opacity);
        const top = photos.reduce((acc, o, k) => (o > 0.95 ? k : acc), -1);
        const segs = [...root.querySelectorAll('.home-life__segments > span')].map((s) =>
          Math.round(new DOMMatrix(getComputedStyle(s, '::after').transform).a * 100) / 100);
        const title = root.querySelector('.home-head .title');
        /** Rendered opacity: the element's times its ancestors'. */
        const eop = (el) => {
          let o = 1;
          for (let e = el; e && e !== root; e = e.parentElement) o *= +getComputedStyle(e).opacity;
          return o;
        };
        const compact = root.querySelector('.home-life__compact');
        return {
          active: root.dataset.active,
          op: cur ? +getComputedStyle(cur).opacity : 0,
          stickyTop: Math.round(sticky.top),
          stickyH: Math.round(sticky.height),
          // what must stay clear of the chapter text: the visible head row (title shrunk → eyebrow/compact + counter)
          head: [root.querySelector('.home-head .eyebrow'), title, compact, root.querySelector('.pinned__counter')]
            .filter((e) => e && getComputedStyle(e).display !== 'none' && eop(e) > 0.5).map(box),
          titleOp: Math.round(eop(title) * 100) / 100,
          titleBox: box(title),
          frame: box(root.querySelector('.home-life__frame')),
          oldArch: getComputedStyle(root.querySelector('.home-arch')).display,
          src: root.querySelectorAll('.home-life__photo')[Math.max(0, top)]?.getAttribute('src') ?? '',
          top,
          segs,
          parts,
          noHScroll: document.documentElement.scrollWidth <= innerWidth,
        };
      });
    };
    const seen = [];
    for (let i = 0; i < geo.n; i++) {
      const r = await at(i);
      seen.push(r);
      const name = shots.includes(i) ? (shots.length > 1 ? `life_v${life}_ch${i + 1}_${w}` : `life_v${life}_${lang === 'he' ? 'he' : w}`) : null;
      if (name) await page.screenshot({ path: join(SHOTS, `${name}.png`) });
      const inside = r.parts.every((p) => p && p.t >= 0 && p.b <= h && p.l >= 15.5 && p.r <= w - 15.5);
      const clashHead = r.parts.some((p) => r.head.some((hd) => over(p, hd)));
      // 1: the text lies over the photo by design; 2: the arch, the head row and the text are apart
      const clashMedia = life === 2 && (r.parts.some((p) => over(p, r.frame)) || r.head.some((hd) => over(hd, r.frame)));
      const media = life === 1
        ? r.frame && r.frame.t <= 0 && r.frame.b >= h && r.frame.l <= 0 && r.frame.r >= w
        : r.frame && r.frame.b - r.frame.t >= h * (i === 0 ? 0.4 : 0.55) && r.frame.l >= 15.5 && r.frame.r <= w - 15.5 && r.frame.r - r.frame.l >= (i === 0 ? 0.6 * w : w - 40);
      check(r.active === String(i) && r.op > 0.95 && r.stickyTop === 0 && r.stickyH === h && r.top === i && r.oldArch === 'none',
        `${tag}: chapter ${i + 1} — pinned, its photo on top`, JSON.stringify({ active: r.active, op: r.op, sticky: [r.stickyTop, r.stickyH], top: r.top }));
      check(media && !clashHead && !clashMedia && inside && r.parts.length >= 3 && r.noHScroll,
        `${tag}: chapter ${i + 1} — ${life === 1 ? 'full-screen photo' : 'big arch'}, text clear of the head${life === 2 ? ' and the arch' : ''}, fits, no h-scroll`,
        JSON.stringify({ frame: r.frame, head: r.head, parts: r.parts }));
      check(r.segs.length === 4 && r.segs.slice(0, i).every((s) => s > 0.99) && r.segs.slice(i + 1).every((s) => s < 0.01),
        `${tag}: chapter ${i + 1} — stories progress`, r.segs.join(' '));
      // the big title: 1 — through chapter 1, then gone; 2 — only at the entry
      if (life === 1) check(i === 0 ? r.titleOp > 0.95 : r.titleOp < 0.05, `${tag}: chapter ${i + 1} — big title ${i === 0 ? 'shown' : 'shrunk'}`, String(r.titleOp));
      if (life === 2 && i > 0) check(r.titleOp < 0.05, `${tag}: chapter ${i + 1} — big title shrunk`, String(r.titleOp));
    }
    check(new Set(seen.map((r) => r.src)).size === 4, `${tag}: the photo changes with every chapter`, seen.map((r) => r.src.split('/').pop()).join(' '));
    if (deep) {
      if (life === 2) {
        // the entry: the big title on top, the arch waits under it
        const e = await at(0, 0);
        check(e.titleOp > 0.95 && e.frame && e.titleBox && e.frame.t >= e.titleBox.b - 24, `${tag}: entry — big title, the arch under it`, JSON.stringify({ t: e.titleBox, f: e.frame }));
        await page.screenshot({ path: join(SHOTS, `life_v2_entry_${w}.png`) });
      }
      // back up: the chapters go back in order
      const back = [];
      for (let i = geo.n - 2; i >= 0; i--) back.push((await at(i)).active);
      check(back.join() === '2,1,0', `${tag}: chapters change on scroll up`, back.join());
      // a finger drag inside the section moves the chapter (native touch scroll, then the auto-settle)
      await at(0);
      await page.touchscreen.touchStart(w / 2, h - 144);
      for (let i = 1; i <= 20; i++) {
        await page.touchscreen.touchMove(w / 2, h - 144 - i * 25);
        await sleep(25);
      }
      await sleep(250); // hold still before lifting: no fling
      await page.touchscreen.touchEnd();
      await sleep(1800);
      const dragged = await page.evaluate(() => document.querySelector('#community .pinned').dataset.active);
      check(dragged === '1', `${tag}: a finger drag of ~0.6 screen moves to chapter 2 (auto-settle)`, dragged);
    }
    await page.close();
  };
  await lifeRun(null, 390, 844, 'ru'); // no parameter → layout 1
  for (const v of [1, 2]) {
    await lifeRun(v, 390, 844, 'ru', { shots: [0, 1, 2, 3], deep: true });
    if (!ONLY) {
      await lifeRun(v, 360, 740, 'ru', { shots: [1] });
      await lifeRun(v, 414, 896, 'ru');
      await lifeRun(v, 390, 844, 'he', { shots: [1] });
    }
  }

  // ---- 4b. Dawn rosette, scroll scene, parallax on phones (native scroll, real heights)
  for (const [w, h] of [[390, 844], [360, 740]]) {
    const page = await open('/?lang=ru', w, { height: h });
    const tag = `${w}×${h}`;
    const touchScroll = async (dy) => {
      // a finger drag (native touch scroll, passive listeners); the wheel only if the drag did not move the page
      const x = Math.round(w / 2);
      const y0 = Math.round(h / 2 + dy / 2);
      const before = await page.evaluate(() => scrollY);
      await page.touchscreen.touchStart(x, y0);
      for (let i = 1; i <= 8; i++) await page.touchscreen.touchMove(x, Math.round(y0 - (dy * i) / 8));
      await sleep(150); // hold the finger still before lifting: no fling, the page moves by exactly the drag
      await page.touchscreen.touchEnd();
      await sleep(700);
      if ((await page.evaluate(() => scrollY)) === before) {
        await page.mouse.move(x, h / 2);
        await page.mouse.wheel({ deltaY: dy });
        await sleep(500);
      }
    };
    // total angle of the Dawn rosette = its own rotation + every rotated wrapper up to the section
    const angle = () =>
      page.evaluate(() => {
        let deg = 0;
        for (let el = document.querySelector('#dawn .rosette'); el && el.id !== 'dawn'; el = el.parentElement) {
          const t = getComputedStyle(el).transform;
          if (t && t !== 'none') {
            const m = new DOMMatrix(t);
            deg += (Math.atan2(m.b, m.a) * 180) / Math.PI;
          }
        }
        return +deg.toFixed(3);
      });
    await page.evaluate(() => document.querySelector('#dawn').scrollIntoView({ block: 'center' }));
    await sleep(600);
    const r1 = await angle();
    await sleep(3000);
    const r2 = await angle();
    check(Math.abs(r2 - r1) > 10, `${tag}: Dawn rosette turns by itself (visible in 3 s)`, `${r1}° → ${r2}°`);
    await shotG(page, `dawn_${w}`);
    const own = () =>
      page.evaluate(() => {
        const m = new DOMMatrix(getComputedStyle(document.querySelector('#dawn .rosette')).transform);
        return +((Math.atan2(m.b, m.a) * 180) / Math.PI).toFixed(3);
      });
    const s1 = await own();
    await touchScroll(-Math.round(h * 0.4));
    const s2 = await own();
    check(Math.abs(s2 - s1) > 1, `${tag}: Dawn rosette also turns with (touch) scroll`, `${s1}° → ${s2}°`);

    const sceneAt = async (p) => {
      await page.evaluate((v) => {
        const s = document.querySelector('.scrub');
        const top = s.getBoundingClientRect().top + scrollY;
        window.scrollTo(0, top + v * (s.offsetHeight - innerHeight));
      }, p);
      await sleep(1200);
      return page.evaluate(() => {
        const c = document.querySelector('.scrub [data-frames]');
        const st = document.querySelector('.scrub__sticky').getBoundingClientRect();
        const cur = document.querySelector('.scrub__chapter[data-current="true"]');
        return {
          frame: c ? +c.dataset.frame : null,
          cw: c ? (c.tagName === 'VIDEO' ? c.clientWidth : c.width) : 0,
          top: Math.round(st.top),
          sh: Math.round(st.height),
          op: cur ? +(+getComputedStyle(cur).opacity).toFixed(2) : null,
          active: document.querySelector('.scrub').dataset.active,
        };
      });
    };
    const a = await sceneAt(0.1);
    await shotG(page, `scene_${w}_p10`);
    const b = await sceneAt(0.9);
    await shotG(page, `scene_${w}_p90`);
    const c = await sceneAt(0.1);
    check(a.frame !== null && b.frame !== null && a.frame !== b.frame && c.frame === a.frame, `${tag}: scene frame scrubs by scroll and back`, `${a.frame} → ${b.frame} → ${c.frame}`);
    check(Math.abs(a.top) <= 1 && Math.abs(a.sh - h) <= 2, `${tag}: scene sticky at 100svh`, JSON.stringify(a));
    check(a.cw > 0 && a.cw <= w * 2 + 1, `${tag}: scene media sized to the phone (canvas DPR ≤ 2)`, String(a.cw));
    check(a.active !== b.active && a.op > 0.9 && b.op > 0.9, `${tag}: scene chapters enter/leave with scroll`, `${a.active}/${a.op} → ${b.active}/${b.op}`);
    const t1 = await page.evaluate(() => +document.querySelector('.scrub [data-frames]')?.dataset.frame);
    // c rests where the auto-settle left it: drag down into the scene
    await touchScroll(Math.round(h * 0.8));
    const t2 = await page.evaluate(() => +document.querySelector('.scrub [data-frames]')?.dataset.frame);
    check(Number.isFinite(t1) && Number.isFinite(t2) && t1 !== t2, `${tag}: a finger drag scrubs the scene`, `${t1} → ${t2}`);

    const par = () =>
      page.evaluate(() => {
        const el = [...document.querySelectorAll('.hexpattern')].find((e) => {
          const r = e.parentElement.getBoundingClientRect();
          return r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.4;
        });
        return el ? +new DOMMatrix(getComputedStyle(el).transform).m42.toFixed(2) : null;
      });
    await page.evaluate(() => document.querySelector('.hexpattern').parentElement.scrollIntoView({ block: 'center' }));
    await sleep(500);
    const y1 = await par();
    await touchScroll(Math.round(h * 0.3));
    const y2 = await par();
    check(y1 !== null && y2 !== null && Math.abs(y2 - y1) > 1, `${tag}: hexagram background parallax`, `${y1} → ${y2}`);
    await page.close();
  }

  // ---- 4c. touch scroll path (390×844): engine, scrub video (main path), fixed sticky height vs the address bar
  {
    const page = await open('/?lang=ru', 390, { height: 844 });
    const tag = '390 touch';
    const main = await (await fetch(`${WEB}/media/scrub/manifest.json`)).json();
    await page.waitForFunction(() => document.querySelector('.scrub')?.dataset.pass === 'video', { timeout: 30000 }).catch(() => undefined);
    const base = await page.evaluate(() => {
      const v = document.querySelector('.scrub video');
      return {
        touch: document.documentElement.dataset.touch ?? null,
        lenis: document.documentElement.classList.contains('lenis'),
        vhFix: document.documentElement.style.getPropertyValue('--vh-fix'),
        sceneH: document.querySelector('.scrub').offsetHeight,
        media: document.querySelector('.scrub').dataset.media,
        pass: document.querySelector('.scrub').dataset.pass,
        video: v ? { frames: +v.dataset.frames, muted: v.muted, inline: v.playsInline, preload: v.preload, paused: v.paused } : null,
        canvas: !!document.querySelector('.scrub canvas'),
        noHScroll: document.documentElement.scrollWidth <= innerWidth,
        pinned: getComputedStyle(document.querySelector('#community .pinned__sticky')).position === 'sticky',
        spin: getComputedStyle(document.querySelector('.home-dawn__spin') ?? document.body).animationName,
      };
    });
    check(base.touch === 'on' && base.vhFix === '844px' && !base.lenis, `${tag}: touch path on (no Lenis), viewport fixed in px`, JSON.stringify(base));
    check(base.noHScroll && base.pinned && base.spin !== 'none', `${tag}: no h-scroll, community pinned, Dawn spin kept`, JSON.stringify(base));
    check(base.sceneH > 844 * 3, `${tag}: scene runway in fixed px`, String(base.sceneH));
    check(
      base.media === 'video' && base.pass === 'video' && !base.canvas && base.video?.frames === main.video?.frames &&
        base.video.muted && base.video.inline && base.video.preload === 'auto' && base.video.paused,
      `${tag}: phone scrubs the scene video (muted, playsinline, preload auto, paused)`,
      JSON.stringify({ ...base.video, manifest: main.video })
    );
    const read = () =>
      page.evaluate(() => ({
        p: +document.querySelector('.scrub').style.getPropertyValue('--p'),
        f: +document.querySelector('.scrub [data-frames]').dataset.frame,
        sh: Math.round(document.querySelector('.scrub__sticky').getBoundingClientRect().height),
        poster: !!document.querySelector('.scrub__poster[data-waiting]'),
        y: scrollY,
      }));
    const geo = await page.evaluate(() => {
      const s = document.querySelector('.scrub');
      return { top: s.getBoundingClientRect().top + scrollY, runway: s.offsetHeight - 844 };
    });
    await page.evaluate((g) => window.scrollTo(0, g.top + g.runway * 0.3625), geo);
    await sleep(1200);
    const r1 = await read();
    await page.touchscreen.touchStart(195, 600);
    for (let i = 1; i <= 8; i++) await page.touchscreen.touchMove(195, 600 - i * 40);
    await page.touchscreen.touchEnd();
    await sleep(1800);
    const r2 = await read();
    check(r2.y > r1.y && r2.f !== r1.f && !r2.poster, `${tag}: a finger drag scrubs the video`, `${JSON.stringify(r1)} → ${JSON.stringify(r2)}`);
    await page.screenshot({ path: join(SHOTS, 'm4_scene_mid_390.png') });
    // the address bar hides: +56px of viewport at the same scrollY — sticky and --p must not jump
    await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await sleep(900);
    const r3 = await read();
    check(r3.sh === 844 && Math.abs(r3.p - r2.p) < 0.002, `${tag}: address bar does not move the scene`, `${JSON.stringify(r2)} → ${JSON.stringify(r3)}`);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    // the very end of the scene: the last frame shows up although the browser stops preloading short of the end
    await page.evaluate((g) => window.scrollTo(0, g.top + g.runway), geo);
    await page.waitForFunction((n) => +document.querySelector('.scrub video').dataset.frame >= n - 3, { timeout: 8000 }, main.video.frames).catch(() => undefined);
    const rEnd = await read();
    check(rEnd.f >= main.video.frames - 3, `${tag}: the end of the scene shows the last frames`, `frame ${rEnd.f} of ${main.video.frames}`);
    await page.screenshot({ path: join(SHOTS, 'm4_scene_end_390.png') });
    await page.close();
  }

  // ---- 4c'. fallback: the video does not load → the light frame set; crossfade only between real neighbours
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('synagogue.preloaded', '1');
      localStorage.setItem('synagogue.cookieConsent', '1');
    });
    await page.setRequestInterception(true);
    page.on('request', (r) => (/\.mp4(\?|$)/.test(r.url()) ? r.abort() : r.continue()));
    await page.goto(`${WEB}/?lang=ru`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const tag = '390 fallback';
    const light = await (await fetch(`${WEB}/media/scrub/m/manifest.json`)).json();
    await page.waitForFunction(() => document.querySelector('.scrub')?.dataset.loaded === 'all', { timeout: 40000 }).catch(() => undefined);
    const fb = await page.evaluate(() => ({
      media: document.querySelector('.scrub').dataset.media,
      frames: +(document.querySelector('.scrub canvas')?.dataset.frames ?? 0),
      video: !!document.querySelector('.scrub video'),
    }));
    check(fb.media === 'frames' && !fb.video && fb.frames === light.frames.length, `${tag}: no video → the light frame set (${light.frames.length})`, JSON.stringify(fb));
    const pairs = await page.evaluate(async () => {
      const s = document.querySelector('.scrub');
      const c = document.querySelector('.scrub canvas');
      const top = s.getBoundingClientRect().top + scrollY;
      const out = { alphas: new Set(), far: 0 };
      for (let i = 0; i < 40; i++) {
        window.scrollTo(0, top + 300 + i * 7);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const [a, b] = (c.dataset.pair ?? '').split('-').map(Number);
        if (Math.abs(a - b) > 1) out.far++;
        out.alphas.add(c.dataset.blend);
      }
      return { far: out.far, alphas: [...out.alphas].filter((x) => +x > 0 && +x < 1).length };
    });
    check(pairs.far === 0 && pairs.alphas >= 3, `${tag}: crossfades only neighbouring frames (i, i+1)`, JSON.stringify(pairs));
    await page.screenshot({ path: join(SHOTS, 'm4_scene_fallback_390.png') });
    await page.close();
  }

  // ---- 4d. auto-settle: once at rest, along the last movement, not at the entry/exit, a touch cancels it
  {
    const page = await open('/?lang=ru', 390, { height: 844 });
    const tag = '390 snap';
    await page.waitForFunction(() => !!document.querySelector('.scrub')?.dataset.pass, { timeout: 30000 }).catch(() => undefined);
    const geo = await page.evaluate(() => {
      const s = document.querySelector('.scrub');
      const top = Math.round(s.getBoundingClientRect().top + scrollY);
      return { top, runway: s.offsetHeight - 844, h: s.offsetHeight };
    });
    // stops of 4 chapters: 0, .3625, .6125, 1 of the runway (touch-scroll.ts chapterStops); a chapter = 844px
    const stop1 = Math.round(geo.top + 0.3625 * geo.runway);
    const stop2 = Math.round(geo.top + 0.6125 * geo.runway);
    const y = () => page.evaluate(() => scrollY);
    const drag = async (dy, lift = true) => {
      await page.touchscreen.touchStart(195, 600);
      for (let i = 1; i <= 10; i++) await page.touchscreen.touchMove(195, Math.round(600 - (dy * i) / 10));
      await sleep(200); // finger still: no fling
      if (lift) await page.touchscreen.touchEnd();
    };
    const settle = async (to) => {
      const t0 = Date.now();
      let at = await y();
      for (let i = 0; i < 30 && Math.abs(at - to) > 2; i++) {
        await sleep(100);
        at = await y();
      }
      return { at, ms: Date.now() - t0 };
    };
    const goTo = async (to) => {
      await page.evaluate((v) => window.scrollTo(0, v), to);
      await sleep(900);
    };
    // forward: half a chapter down from chapter 02 → on to chapter 03
    await goTo(stop1);
    await drag(422, false);
    const yHeld0 = await y();
    await sleep(500);
    await page.screenshot({ path: join(SHOTS, 'm4_scene_snap_before_390.png') });
    const yHeld = await y();
    check(Math.abs(yHeld - yHeld0) <= 1, `${tag}: no glide while the finger is down`, `${yHeld0} → ${yHeld}`);
    await page.touchscreen.touchEnd();
    const fwd = await settle(stop2);
    await sleep(300);
    await page.screenshot({ path: join(SHOTS, 'm4_scene_snap_after_390.png') });
    const act = await page.evaluate(() => document.querySelector('.scrub').dataset.active);
    check(Math.abs(fwd.at - stop2) <= 2 && act === '2' && fwd.ms < 1200, `${tag}: half a chapter down → glides on to chapter 03`, `${yHeld} → ${fwd.at} (stop ${stop2}, ${fwd.ms} ms, chapter ${act})`);
    // back: 15% of a chapter down → back to the chapter it left (≤ 0.3 screen against the movement)
    await drag(127);
    const back = await settle(stop2);
    check(Math.abs(back.at - stop2) <= 2, `${tag}: a short pull down → back to the current chapter`, `${stop2 + 127} → ${back.at}`);
    // up: half a chapter up → on to chapter 02 (the direction of the movement)
    await drag(-422);
    const upw = await settle(stop1);
    check(Math.abs(upw.at - stop1) <= 2, `${tag}: half a chapter up → glides on up to chapter 02`, `${stop2 - 422} → ${upw.at}`);
    // once per rest: after the glide the page stays
    await sleep(800);
    const still = await y();
    check(Math.abs(still - stop1) <= 2, `${tag}: one glide per rest, no repeat`, `${upw.at} → ${still}`);
    // a touch during the glide stops it where it is
    await drag(300);
    await sleep(260); // 150 ms of rest, the glide on to chapter 03 has started
    await page.touchscreen.touchStart(195, 400);
    const yCut = await y();
    await sleep(700);
    const yCut2 = await y();
    await page.touchscreen.touchEnd();
    check(Math.abs(yCut2 - yCut) <= 1 && Math.abs(yCut2 - stop2) > 5, `${tag}: a touch cancels the glide at once`, `${yCut} → ${yCut2}`);
    // the entry and the exit of the scene, and outside it: nothing is pulled
    for (const [what, at] of [['entry', geo.top + 100], ['exit', geo.top + geo.runway + 200], ['outside', geo.top + geo.h + 400]]) {
      await goTo(at);
      await sleep(600);
      const now = await y();
      check(Math.abs(now - at) <= 1, `${tag}: no pull at the ${what} of the scene`, `${at} → ${now}`);
    }
    await page.close();
  }
  {
    // desktop never changes: the full set, Lenis, pinned chapters, no video
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('synagogue.preloaded', '1');
      localStorage.setItem('synagogue.cookieConsent', '1');
    });
    await page.goto(`${WEB}/?lang=ru`, { waitUntil: 'networkidle2', timeout: 90000 });
    await sleep(800);
    const d = await page.evaluate(() => ({
      touch: document.documentElement.dataset.touch ?? null,
      pin: document.documentElement.dataset.pin,
      frames: +(document.querySelector('.scrub canvas')?.dataset.frames ?? 0),
      video: !!document.querySelector('.scrub video'),
      tall: document.querySelector('.scrub').offsetHeight > innerHeight * 3,
    }));
    check(d.touch === null && d.pin === 'on' && d.frames === 110 && !d.video && d.tall, 'desktop: unchanged (full set, no touch path, no video)', JSON.stringify(d));
    await page.close();
  }
  {
    const page = await open('/?lang=ru', 390, { reduced: true, height: 844 });
    const r = await page.evaluate(() => ({ touch: document.documentElement.dataset.touch ?? null, scene: document.querySelector('.scrub').className }));
    check(r.touch === null && r.scene.includes('scrub--static'), '390 reduced: static scene, no touch path', JSON.stringify(r));
    await page.close();
  }

  // ---- 5. reduced motion: nothing moves, everything visible
  {
    const page = await open('/?lang=ru', 390, { reduced: true, height: 844 });
    const st = await page.evaluate(() => {
      const el = document.querySelector('#visit .reveal');
      return {
        op: getComputedStyle(el).opacity,
        anim: getComputedStyle(document.querySelector('.home-marquee .marquee__track')).animationName,
        motion: document.documentElement.dataset.motion,
        scene: document.querySelector('.scrub').className,
        chapters: [...document.querySelectorAll('.scrub__chapter')].every((x) => +getComputedStyle(x).opacity === 1),
      };
    });
    check(+st.op === 1 && st.anim === 'none' && st.motion !== 'on' && st.scene.includes('scrub--static') && st.chapters, '390 reduced: static and visible', JSON.stringify(st));
    const comm = await page.evaluate(() => {
      const root = document.querySelector('#community .pinned');
      const ch = [...root.querySelectorAll('.pinned__chapter')];
      return {
        sticky: getComputedStyle(root.querySelector('.pinned__sticky')).position,
        ribbon: !!root.querySelector('[data-ribbon], .pinned__dot'),
        visible: ch.filter((c) => +getComputedStyle(c).opacity === 1 && c.getBoundingClientRect().height > 0).length,
        n: ch.length,
        photos: ch.map((c) => Math.round(c.querySelector('.home-chapter__photo').getBoundingClientRect().width)),
        aside: getComputedStyle(root.querySelector('.pinned__aside')).display,
        noHScroll: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    check(comm.sticky !== 'sticky' && !comm.ribbon && comm.visible === comm.n && comm.n === 4, '390 reduced: «Жизнь общины» is a static column of all chapters', JSON.stringify(comm));
    check(comm.photos.every((w) => w >= 389) && comm.aside === 'none' && comm.noHScroll, '390 reduced: every chapter has its full-width photo, no h-scroll', JSON.stringify(comm));
    await page.evaluate(() => document.querySelector('#community .pinned__chapter:nth-child(2)').scrollIntoView({ block: 'start' }));
    await sleep(400);
    await page.screenshot({ path: join(SHOTS, 'life_reduced_390.png') });
    const rot = () =>
      page.evaluate(() => {
        const out = [];
        for (let el = document.querySelector('#dawn .rosette'); el && el.id !== 'dawn'; el = el.parentElement) out.push(getComputedStyle(el).transform);
        return out.join('|');
      });
    await page.evaluate(() => document.querySelector('#dawn').scrollIntoView({ block: 'center' }));
    await sleep(300);
    const q1 = await rot();
    await sleep(1500);
    const q2 = await rot();
    check(q1 === q2 && q1.split('|').every((t) => t === 'none' || t.startsWith('matrix(1, 0, 0, 1')), '390 reduced: Dawn rosette static', q1);
    await shotG(page, 'reduced_dawn_390');
    await page.close();
  }

  // ---- 6. tablet + he snapshots
  if (!ONLY) {
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
