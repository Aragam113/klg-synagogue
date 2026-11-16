#!/usr/bin/env node
/** Browser icons derived from the original community vector logo. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

const DEEP = '#0a0f43';
const NAME = 'Новая синагога, Калининград';
const SHORT = 'Синагога';
const original = (await readFile(path.join(pub, 'media/brand/synagogue-logo.svg'), 'utf8')).replace(
  /\r\n?/g,
  '\n'
);
const artwork = original
  .replace(/<svg[^>]*>/, '')
  .replace('</svg>', '')
  .replace(/<title>.*?<\/title>/s, '');
// Keep every original contour. Padding keeps the points clear of platform icon masks.
const iconSvg = (light = false) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">' +
  (light ? '<rect width="800" height="800" fill="' + DEEP + '"/>' : '') +
  '<g transform="translate(111.45 68.18) scale(.94)">' +
  (light ? artwork.replaceAll('#0a0f43', '#ffffff') : artwork) +
  '</g></svg>';

const png = (svg, size, opts = {}) => {
  let img = sharp(Buffer.from(svg), { density: Math.max(72, (72 * size) / 800) }).resize(
    size,
    size
  );
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

const svg = iconSvg(true);
const p16 = await png(svg, 16);
const p32 = await png(svg, 32);
const p48 = await png(svg, 48);

await out('favicon.svg', `${svg}\n`);
await out(
  'favicon.ico',
  ico([
    { size: 16, data: p16 },
    { size: 32, data: p32 },
    { size: 48, data: p48 },
  ])
);
await out('favicon-16.png', p16);
await out('favicon-32.png', p32);
// An opaque tile for iOS; the same original logo in white.
await out('apple-touch-icon.png', await png(iconSvg(true), 180, { flatten: true }));
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
    2
  )}\n`
);
console.log(
  'favicon: public/favicon.{svg,ico}, favicon-{16,32}.png, apple-touch-icon.png, icon-{192,512}.png, site.webmanifest'
);
