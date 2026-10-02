#!/usr/bin/env node
/**
 * Frames for the home-page synagogue scroll scene.
 *
 *   npm run build:scrub -- <video file | folder of photos> [options]
 *
 * Video (mp4/webm/mov/mkv/avi): ffmpeg-static cuts [--from, --to] seconds into N evenly spaced frames.
 * Folder of photos (jpg/png/webp): sharp builds a smooth sequence — slow zoom/pan inside each photo and
 * a crossfade between neighbours.
 *
 * Writes public/media/scrub/frame-NNN.webp + manifest.json {frames, width, height, credits} (old frames are
 * removed) and a «Сцена главной» block in public/media/CREDITS.md. Keeps the total weight under --budget MB
 * by lowering webp quality.
 *
 * Options:
 *   --from <s>       start of the video segment, seconds (default 0)
 *   --to <s>         end of the video segment, seconds (default: end of the video)
 *   --frames <n>     number of frames, 2..120 (default 110)
 *   --width <px>     max frame width (default 1600; never upscales video)
 *   --quality <q>    starting webp quality (default 72)
 *   --budget <MB>    total size limit (default 12)
 *   --credit "<text>"  attribution shown in the corner of the scene and in CREDITS.md
 *   --light <px>     width of the light phone set (default 640, 0 = none): public/media/scrub/m/ + its own
 *                    manifest.json; the main manifest gets "light": "m/manifest.json" (phones, touch ?a=2|3)
 *   --light-step <n> keep every n-th frame in the light set (default 2: half the download on a mobile network)
 *
 *   npm run build:scrub -- --light-only [--light 640]
 *                    re-encodes only the light set from the frames already in public/media/scrub/
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'media', 'scrub');
const CREDITS = path.join(ROOT, 'public', 'media', 'CREDITS.md');
const VIDEO = /\.(mp4|webm|mov|mkv|avi|m4v)$/i;
const IMAGE = /\.(jpe?g|png|webp)$/i;

const parseArgs = (argv) => {
  const opts = { frames: 110, width: 1600, quality: 72, budget: 12, from: 0, to: null, credit: '', light: 640, lightStep: 2, lightOnly: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--light-only') {
      opts.lightOnly = true;
      continue;
    }
    if (!a.startsWith('--')) {
      rest.push(a);
      continue;
    }
    const key = a.slice(2);
    const val = argv[++i];
    if (val === undefined) throw new Error(`no value for ${a}`);
    opts[key] = key === 'credit' ? val : Number(val);
    if (key !== 'credit' && !Number.isFinite(opts[key])) throw new Error(`${a} needs a number`);
  }
  if (!rest[0] && !opts.lightOnly) throw new Error('usage: npm run build:scrub -- <video | photo folder> [options]');
  opts.source = rest[0] ? path.resolve(process.cwd(), rest[0]) : '';
  opts.frames = Math.max(2, Math.min(120, Math.round(opts.frames)));
  return opts;
};

const run = (args) => execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', ...args]);

const probeDuration = (file) => {
  try {
    execFileSync(ffmpegPath, ['-hide_banner', '-i', file], { stdio: 'pipe' });
  } catch (e) {
    const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(String(e.stderr ?? ''));
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  throw new Error(`cannot read duration of ${file}`);
};

/** Raw PNG frames from a video segment, evenly spaced. */
const framesFromVideo = (o, tmp) => {
  const dur = probeDuration(o.source);
  const from = Math.max(0, o.from);
  const to = Math.min(dur, o.to ?? dur);
  if (to - from < 0.5) throw new Error(`segment ${from}..${to}s is too short`);
  const fps = o.frames / (to - from);
  run([
    '-ss', String(from), '-t', String(to - from), '-i', o.source,
    '-vf', `fps=${fps.toFixed(5)},scale='min(${o.width},iw)':-2:flags=lanczos`,
    '-frames:v', String(o.frames), path.join(tmp, 'raw-%03d.png'),
  ]);
  return fs.readdirSync(tmp).filter((f) => f.startsWith('raw-')).sort().map((f) => path.join(tmp, f));
};

/** Photo folder → zoom/pan + crossfade sequence of PNG buffers written to tmp. */
const framesFromPhotos = async (o, tmp) => {
  const photos = fs.readdirSync(o.source).filter((f) => IMAGE.test(f)).sort().map((f) => path.join(o.source, f));
  if (!photos.length) throw new Error(`no jpg/png/webp in ${o.source}`);
  const W = o.width;
  const H = Math.round((W * 9) / 16);
  // each photo is pre-scaled to cover 1.15x the frame so zoom/pan never shows edges
  const base = await Promise.all(
    photos.map((p) =>
      sharp(p).rotate().resize(Math.round(W * 1.15), Math.round(H * 1.15), { fit: 'cover' }).toBuffer()
    )
  );
  const shot = async (k, t) => {
    // t 0..1 inside photo k: zoom 1.15 → 1.0 crop window, alternating pan direction
    const z = 1 + 0.15 * (1 - t);
    const bw = Math.round(W * 1.15);
    const bh = Math.round(H * 1.15);
    const cw = Math.round(bw / z);
    const ch = Math.round(bh / z);
    const dir = k % 2 ? -1 : 1;
    const left = Math.round((bw - cw) / 2 + dir * (bw - cw) * 0.4 * (t - 0.5));
    const top = Math.round((bh - ch) / 2);
    return sharp(base[k])
      .extract({ left: Math.max(0, Math.min(bw - cw, left)), top, width: cw, height: ch })
      .resize(W, H)
      .raw()
      .toBuffer();
  };
  const per = o.frames / photos.length;
  const fade = 0.3; // last 30% of each photo crossfades into the next one
  const files = [];
  for (let i = 0; i < o.frames; i++) {
    const pos = i / per;
    const k = Math.min(photos.length - 1, Math.floor(pos));
    const t = Math.min(1, pos - k);
    let px = await shot(k, t);
    if (k < photos.length - 1 && t > 1 - fade) {
      const a = (t - (1 - fade)) / fade;
      const next = await shot(k + 1, 0);
      const mix = Buffer.alloc(px.length);
      for (let j = 0; j < px.length; j++) mix[j] = Math.round(px[j] * (1 - a) + next[j] * a);
      px = mix;
    }
    const f = path.join(tmp, `raw-${String(i + 1).padStart(3, '0')}.png`);
    await sharp(px, { raw: { width: W, height: H, channels: 3 } }).png().toFile(f);
    files.push(f);
  }
  return files;
};

const encode = async (raw, quality) => {
  const bufs = [];
  for (const f of raw) bufs.push(await sharp(f).webp({ quality, effort: 5 }).toBuffer());
  return bufs;
};

const writeCredits = (credit) => {
  const block = `<!-- scrub:start -->\n## Сцена главной (кадры прокрутки)\n\n- ${credit}\n<!-- scrub:end -->`;
  let text = fs.existsSync(CREDITS) ? fs.readFileSync(CREDITS, 'utf8') : '# Медиа сайта — авторы и лицензии\n';
  text = /<!-- scrub:start -->[\s\S]*<!-- scrub:end -->/.test(text)
    ? text.replace(/<!-- scrub:start -->[\s\S]*<!-- scrub:end -->/, block)
    : `${text.trimEnd()}\n\n${block}\n`;
  fs.writeFileSync(CREDITS, text, 'utf8');
};

const LIGHT = 'm';

/** Light phone set: every `step`-th frame resized to `width`, webp q60, into scrub/m/ + manifest; links it from the main one. */
const writeLight = async (all, width, step) => {
  const k = Math.max(1, Math.round(step));
  const sources = all.filter((_, i) => i % k === 0 || i === all.length - 1);
  const dir = path.join(OUT, LIGHT);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^frame-\d+\.webp$/.test(f) || f === 'manifest.json') fs.unlinkSync(path.join(dir, f));
  let bytes = 0;
  const frames = [];
  for (let i = 0; i < sources.length; i++) {
    const name = `frame-${String(i + 1).padStart(3, '0')}.webp`;
    const buf = await sharp(sources[i]).resize({ width, withoutEnlargement: true }).webp({ quality: 60, effort: 5 }).toBuffer();
    fs.writeFileSync(path.join(dir, name), buf);
    bytes += buf.length;
    frames.push(name);
  }
  const meta = await sharp(path.join(dir, frames[0])).metadata();
  const mainPath = path.join(OUT, 'manifest.json');
  const main = JSON.parse(fs.readFileSync(mainPath, 'utf8'));
  const poster = typeof main.poster === 'number' ? Math.min(frames.length - 1, Math.round(main.poster / k)) : Math.round((frames.length - 1) / 2);
  const manifest = { frames, width: meta.width, height: meta.height, credits: main.credits ?? '', poster };
  fs.writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}
`);
  fs.writeFileSync(mainPath, `${JSON.stringify({ ...main, light: `${LIGHT}/manifest.json` }, null, 2)}
`);
  console.log(`scrub light: ${frames.length} frames ${meta.width}x${meta.height}, ${(bytes / 1048576).toFixed(1)} MB → ${path.relative(ROOT, dir)}`);
};

const main = async () => {
  const o = parseArgs(process.argv.slice(2));
  if (o.lightOnly) {
    const m = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
    await writeLight(m.frames.map((f) => path.join(OUT, f)), o.light || 640, o.lightStep);
    return;
  }
  if (!fs.existsSync(o.source)) throw new Error(`not found: ${o.source}`);
  const isDir = fs.statSync(o.source).isDirectory();
  if (!isDir && !VIDEO.test(o.source)) throw new Error('source must be a video file or a folder of photos');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scrub-'));
  try {
    const raw = isDir ? await framesFromPhotos(o, tmp) : framesFromVideo(o, tmp);
    if (raw.length < 2) throw new Error('got fewer than 2 frames');
    let q = o.quality;
    let bufs = await encode(raw, q);
    const total = () => bufs.reduce((s, b) => s + b.length, 0);
    while (total() > o.budget * 1024 * 1024 && q > 30) {
      q -= 8;
      bufs = await encode(raw, q);
    }
    const meta = await sharp(raw[0]).metadata();
    fs.mkdirSync(OUT, { recursive: true });
    for (const f of fs.readdirSync(OUT)) if (/^frame-\d+\.webp$/.test(f)) fs.unlinkSync(path.join(OUT, f));
    const frames = bufs.map((b, i) => {
      const name = `frame-${String(i + 1).padStart(3, '0')}.webp`;
      fs.writeFileSync(path.join(OUT, name), b);
      return name;
    });
    const credits = o.credit || `${path.basename(o.source)}`;
    const manifest = { frames, width: meta.width, height: meta.height, credits };
    fs.writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    writeCredits(credits);
    if (o.light > 0) await writeLight(raw, o.light, o.lightStep);
    console.log(
      `scrub: ${frames.length} frames ${meta.width}x${meta.height}, webp q${q}, ${(total() / 1048576).toFixed(1)} MB → ${path.relative(ROOT, OUT)}`
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
};

main().catch((e) => {
  console.error(`build:scrub: ${e.message}`);
  process.exit(1);
});
