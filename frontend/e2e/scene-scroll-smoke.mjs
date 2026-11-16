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
