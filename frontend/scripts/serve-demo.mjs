#!/usr/bin/env node
/**
 * Serves `dist/` like GitHub Pages does: under the base path, unknown paths → 404 + 404.html (SPA fallback);
 * outside the base path — a bare 404 (like github.io itself), so links that lose the base path show up.
 * Byte ranges (206) as on Pages: the scene's scrub video seeks by range requests.
 * `node scripts/serve-demo.mjs [port=8231] [base=/klg-synagogue]` (DEMO_DIST=<dir> instead of dist/)
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', process.env.DEMO_DIST || 'dist');
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
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

const send = (res, file, status = 200, req = null, size = 0) => {
  const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
  const m = status === 200 && size ? /^bytes=(\d*)-(\d*)$/.exec(req?.headers.range ?? '') : null;
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(size - 1, Number(m[2])) : size - 1;
    if (start > end || start >= size) {
      res.writeHead(416, { 'content-range': `bytes */${size}` });
      return res.end();
    }
    res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': end - start + 1, 'content-range': `bytes ${start}-${end}/${size}` });
    return createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(status, { 'content-type': type, ...(size ? { 'accept-ranges': 'bytes', 'content-length': size } : {}) });
  createReadStream(file).pipe(res);
};

createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  // Outside the base path GitHub Pages answers with its own 404, not the site's 404.html.
  if (!url.startsWith(`${base}/`) && url !== base) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end(`404: ${url} is outside ${base}/`);
  }
  const rel = url.slice(base.length) || '/';
  const file = path.join(dist, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!file.startsWith(dist)) return send(res, path.join(dist, '404.html'), 404);
  const s = await stat(file).catch(() => null);
  if (s?.isFile()) return send(res, file, 200, req, s.size);
  if (s?.isDirectory()) {
    const index = path.join(file, 'index.html');
    if (await stat(index).catch(() => null)) return send(res, index);
  }
  send(res, path.join(dist, '404.html'), 404);
}).listen(port, () => console.log(`demo: http://localhost:${port}${base}/`));
