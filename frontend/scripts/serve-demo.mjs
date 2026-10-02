#!/usr/bin/env node
/**
 * Serves `dist/` like GitHub Pages does: under the base path, unknown paths → 404.html (SPA fallback).
 * `node scripts/serve-demo.mjs [port=8231] [base=/klg-synagogue]`
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.argv[2] || 8231);
const base = (process.argv[3] || '/klg-synagogue').replace(/\/+$/, '');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

const send = (res, file, status = 200) => {
  res.writeHead(status, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
};

createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (!url.startsWith(`${base}/`) && url !== base) return send(res, path.join(dist, '404.html'), 404);
  const rel = url.slice(base.length) || '/';
  const file = path.join(dist, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!file.startsWith(dist)) return send(res, path.join(dist, '404.html'), 404);
  const s = await stat(file).catch(() => null);
  if (s?.isFile()) return send(res, file);
  if (s?.isDirectory()) {
    const index = path.join(file, 'index.html');
    if (await stat(index).catch(() => null)) return send(res, index);
  }
  send(res, path.join(dist, '404.html'), 404);
}).listen(port, () => console.log(`demo: http://localhost:${port}${base}/`));
