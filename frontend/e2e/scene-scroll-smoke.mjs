/** Mobile scene regression: camera follows real touch swipes, reversals and viewport changes. */
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const WEB = process.env.WEB_URL ?? 'http://localhost:8231';
const PATH = process.env.WEB_PATH ?? '/klg-synagogue/';
const widths = (process.env.SCENE_WIDTHS ?? '360,390,430').split(',').map(Number);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
});
try {
  for (const width of widths) {
    const page = await browser.newPage();
    const errors = [];
    if (process.env.SCENE_CPU)
      await (
        await page.createCDPSession()
      ).send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.SCENE_CPU) });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('synagogue.preloaded', '1');
      localStorage.setItem('synagogue.cookieConsent', '1');
    });
    await page.goto(WEB + PATH + '?lang=ru' + (process.env.SCENE_QUERY ?? ''), {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(() => document.querySelector('.scrub')?.dataset.loaded === 'all');
    await page.waitForFunction(() => !document.querySelector('[data-preloader]'));
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.evaluate(() => {
      const scene = document.querySelector('.scrub');
      return {
        top: scene.getBoundingClientRect().top + scrollY,
        runway: scene.offsetHeight - scene.querySelector('.scrub__sticky').offsetHeight,
      };
    });
    await page.evaluate(({ top, runway }) => scrollTo(0, top + runway * 0.25), geometry);
    await sleep(1000);
    await page.evaluate(() => {
      window.__sceneSamples = [];
      window.__sceneRecording = true;
      const sample = () => {
        if (!window.__sceneRecording) return;
        const scene = document.querySelector('.scrub');
        const film = scene.querySelector('.scrub__film');
        const canvas = scene.querySelector('canvas[data-frames]');
        const raw = Math.min(
          1,
          Math.max(
            0,
            -scene.getBoundingClientRect().top /
              (scene.offsetHeight - scene.querySelector('.scrub__sticky').offsetHeight)
          )
        );
        const duration = film?.querySelector('video')?.duration;
        const target = film ? Number(film.dataset.target) / duration : raw;
        const shown = film
          ? Number(film.dataset.pos) / duration
          : Number(canvas?.dataset.pos) / (Number(canvas?.dataset.frames) - 1);
        window.__sceneSamples.push({ y: scrollY, target, shown });
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const cdp = await page.createCDPSession();
    const touch = (type, y) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x: Math.round(width / 2), y }],
      });
    // One gesture changes direction without lifting the finger: the camera must reverse promptly.
    await touch('touchStart', 700);
    for (const y of [640, 560, 470, 370, 260, 150, 220, 320, 430, 540, 650]) {
      await touch('touchMove', y);
      await sleep(35);
    }
    await sleep(160);
    await touch('touchEnd');
    await sleep(400);
    const samples = await page.evaluate(() => {
      window.__sceneRecording = false;
      return window.__sceneSamples;
    });
    assert.ok(samples.length > 15, 'Recorded touch motion');
    const ys = samples.map((sample) => sample.y);
    assert.ok(Math.max(...ys) - Math.min(...ys) > 250, 'Gesture actually scrolls the page');
    assert.ok(
      samples.some((sample, i) => i && sample.y < samples[i - 1].y - 1),
      'Gesture reverses the page'
    );
    assert.ok(
      samples.every((sample) => Number.isFinite(sample.shown)),
      'Camera always has a decoded picture'
    );
    const maxLag = Math.max(...samples.map((sample) => Math.abs(sample.target - sample.shown)));
    assert.ok(
      maxLag < 0.08,
      width + 'px: camera lags more than 8% of the scene: ' + maxLag.toFixed(3)
    );
    assert.equal(
      await page.$eval('.scrub', (scene) => scene.dataset.mode),
      'frames',
      'Touch defaults to decoded frames'
    );
    // A short swipe inside a readable chapter receives a gentle assist, along the swipe.
    const at = (p) => Math.round(geometry.top + geometry.runway * p);
    const go = async (p) => {
      await page.evaluate((y) => scrollTo(0, y), at(p));
      await sleep(500);
    };
    const drag = async (dy) => {
      await touch('touchStart', 600);
      for (let i = 1; i <= 8; i++) {
        await touch('touchMove', 600 - (dy * i) / 8);
        await sleep(25);
      }
      await sleep(180); // lift without browser inertia
      await touch('touchEnd');
      return page.evaluate(() => scrollY);
    };
    const settle = async (target) => {
      await page
        .waitForFunction((y) => Math.abs(scrollY - y) <= 2, { timeout: 2200 }, target)
        .catch(async () => {
          const actual = await page.evaluate(() => {
            const s = document.querySelector('.scrub');
            return { y: scrollY, top: s.getBoundingClientRect().top + scrollY, h: s.offsetHeight };
          });
          throw new Error(
            'Reading assist did not settle: ' + JSON.stringify({ target, actual, geometry })
          );
        });
      await sleep(250);
      const y = await page.evaluate(() => scrollY);
      assert.ok(Math.abs(y - target) <= 2, 'Assistance stops once at the reading hold');
      return y;
    };
    await go(0.3);
    const downFrom = await drag(90);
    const downTo = await settle(at(0.365));
    assert.ok(
      downTo > downFrom && downTo - downFrom <= geometry.runway / 8,
      'Forward assist follows the swipe within half a chapter: ' +
        JSON.stringify({ downFrom, downTo })
    );
    await go(0.42);
    const upFrom = await drag(-90);
    const upTo = await settle(at(0.365));
    assert.ok(
      upTo < upFrom && upFrom - upTo <= geometry.runway / 8,
      'Reverse assist follows the swipe within half a chapter: ' + JSON.stringify({ upFrom, upTo })
    );
    if (width === 390) {
      await go(0.3);
      const released = await drag(90);
      await page.waitForFunction((y) => scrollY > y + 4, { timeout: 1000 }, released);
      await touch('touchStart', 500);
      const cut = await page.evaluate(() => scrollY);
      await sleep(700);
      assert.ok(
        Math.abs((await page.evaluate(() => scrollY)) - cut) <= 1,
        'A new touch cancels assistance immediately'
      );
      assert.ok(Math.abs(cut - at(0.365)) > 5, 'Touch interrupts before landing');
      await touch('touchEnd');
      await go(0.33);
      await sleep(600);
      assert.ok(
        Math.abs((await page.evaluate(() => scrollY)) - at(0.33)) <= 1,
        'Programmatic navigation does not trigger assistance'
      );
      await touch('touchStart', 500);
      await touch('touchEnd');
      const tapped = await page.evaluate(() => scrollY);
      await sleep(1000);
      assert.ok(
        Math.abs((await page.evaluate(() => scrollY)) - tapped) <= 1,
        'A tap without scrolling does not trigger assistance'
      );
      for (const p of [-0.08, 1.08]) {
        await go(p);
        const outside = await drag(p < 0 ? 90 : -90);
        await sleep(1100);
        assert.ok(
          Math.abs((await page.evaluate(() => scrollY)) - outside) <= 1,
          'Assistance never pulls the user back from outside the scene'
        );
      }
    }
    console.log('PASS ' + width + 'px: reading assists follow swipes and remain interruptible');
    // Hold a readable chapter while the address bar changes height; neither the frame nor sticky height jumps.
    await touch('touchStart', 500);
    await page.evaluate(({ top, runway }) => scrollTo(0, top + runway * 0.69), geometry);
    await sleep(700);
    const state = () =>
      page.evaluate(() => ({
        y: scrollY,
        frame: Number(document.querySelector('.scrub canvas[data-frames]').dataset.frame),
        sticky: document.querySelector('.scrub__sticky').offsetHeight,
        current: Number(document.querySelector('.scrub').dataset.active),
        visible: [...document.querySelectorAll('.scrub__chapter')].map((chapter) =>
          Number(getComputedStyle(chapter).opacity)
        ),
      }));
    const before = await state();
    for (const height of [900, 788, 844]) {
      await page.setViewport({ width, height, isMobile: true, hasTouch: true });
      await sleep(350);
      const after = await state();
      assert.equal(after.sticky, before.sticky, 'Address bar keeps the sticky height');
      assert.ok(Math.abs(after.frame - before.frame) <= 1, 'Address bar keeps the camera position');
      assert.equal(after.current, before.current, 'Address bar keeps the active chapter');
      assert.ok(after.visible[after.current] > 0.95, 'Current chapter is readable');
      assert.ok(Math.abs(after.y - before.y) <= 1, 'Address bar causes no auto-scroll');
      assert.ok(
        Math.abs(after.visible[after.current] - before.visible[before.current]) < 0.02,
        'Address bar keeps the chapter opacity'
      );
    }
    await touch('touchEnd');
    assert.deepEqual(errors, [], 'No page errors');
    console.log(
      'PASS ' +
        width +
        'px: touch reversal, max camera lag ' +
        (maxLag * 100).toFixed(1) +
        '%, address bar stable'
    );
    await page.close();
  }
} finally {
  await browser.close();
}
