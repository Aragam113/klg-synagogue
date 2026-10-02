#!/usr/bin/env node
/**
 * Site icons from code: `npm run build:favicon` → public/favicon.svg, favicon.ico (16/32/48), favicon-32.png,
 * apple-touch-icon.png (180, opaque), icon-192.png, icon-512.png, site.webmanifest.
 * Magen David as in the header logo (`src/ui/judaica/magen-david.tsx`) on a rounded `--deep` square, light gold.
 * 16 px gets its own simplified glyph: a solid star — thin outlines vanish at that size.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

// Tokens from src/ui/styles/site.css (--deep, --deeper); gold lightened from --gold #8a7352 for contrast on --deep.
const DEEP = '#233a45';
const DEEPER = '#15242b';
const GOLD = '#d4b98a';
const NAME = 'Новая синагога, Калининград';
const SHORT = 'Синагога';

/** Two interlaced equilateral triangles, circumradius r, centred at (c, c). */
const triangles = (c, r) => {
  const dx = (r * Math.sqrt(3)) / 2;
  const f = (n) => +n.toFixed(2);
  const up = `${f(c)},${f(c - r)} ${f(c + dx)},${f(c + r / 2)} ${f(c - dx)},${f(c + r / 2)}`;
  const down = `${f(c)},${f(c + r)} ${f(c + dx)},${f(c - r / 2)} ${f(c - dx)},${f(c - r / 2)}`;
  return [up, down];
};

/** Detailed icon (≥ 32 px): outlined star, thick enough to survive 32 px. */
const outlineSvg = ({ rounded = true, scale = 1 } = {}) => {
  const [up, down] = triangles(32, 22 * scale);
  const bg = rounded
    ? `<rect width="64" height="64" rx="14" fill="${DEEP}"/>`
    : `<rect width="64" height="64" fill="${DEEP}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg}<g fill="none" stroke="${GOLD}" stroke-width="${(5.2 * scale).toFixed(2)}" stroke-linejoin="round"><polygon points="${up}"/><polygon points="${down}"/></g></svg>`;
};

/** 16 px glyph: solid hexagram with a small --deeper hexagon core, on a tighter rounded square. */
const smallSvg = () => {
  const [up, down] = triangles(8, 6.6);
  const [hu, hd] = triangles(8, 2.1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="${DEEP}"/><g fill="${GOLD}" stroke="${GOLD}" stroke-width="0.6" stroke-linejoin="round"><polygon points="${up}"/><polygon points="${down}"/></g><g fill="${DEEPER}"><polygon points="${hu}"/><polygon points="${hd}"/></g></svg>`;
};

const png = (svg, size, opts = {}) => {
  let img = sharp(Buffer.from(svg), { density: Math.max(72, (72 * size) / 16) }).resize(size, size);
  if (opts.flatten) img = img.flatten({ background: DEEP });
  return img.png({ compressionLevel: 9 }).toBuffer();
};

/** ICO container with PNG-encoded entries (supported by every browser since Vista-era IE). */
const ico = (entries) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.data)]);
};

const out = (name, data) => writeFile(path.join(pub, name), data);

const svg = outlineSvg();
const p16 = await png(smallSvg(), 16);
const p32 = await png(svg, 32);
const p48 = await png(svg, 48);

await out('favicon.svg', `${svg}\n`);
await out('favicon.ico', ico([
  { size: 16, data: p16 },
  { size: 32, data: p32 },
  { size: 48, data: p48 },
]));
await out('favicon-16.png', p16);
await out('favicon-32.png', p32);
// iOS rounds corners itself and shows transparency as black: full-bleed square, star with padding.
await out('apple-touch-icon.png', await png(outlineSvg({ rounded: false, scale: 0.78 }), 180, { flatten: true }));
await out('icon-192.png', await png(svg, 192));
await out('icon-512.png', await png(svg, 512));
await out(
  'site.webmanifest',
  `${JSON.stringify(
    {
      name: NAME,
      short_name: SHORT,
      lang: 'ru',
      start_url: './',
      scope: './',
      display: 'standalone',
      theme_color: DEEP,
      background_color: DEEP,
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      ],
    },
    null,
    2,
  )}\n`,
);
console.log('favicon: public/favicon.{svg,ico}, favicon-{16,32}.png, apple-touch-icon.png, icon-{192,512}.png, site.webmanifest');
