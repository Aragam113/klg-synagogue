#!/usr/bin/env node
/**
 * GitHub Pages demo build: `npm run build:demo` =
 * `EXPO_PUBLIC_DEMO=1 npx expo export -p web` + SPA fallback `dist/404.html` (copy of index.html) + `dist/.nojekyll`.
 * Icon links of `public/index.html` are root-absolute (`/favicon.svg`): here they get the demo base path.
 * Needs no backend: the API is answered from the committed snapshot `public/demo-data/` (`npm run demo:snapshot`).
 */
import { spawnSync } from 'node:child_process';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// DEMO_OUT=<dir> — build elsewhere (a parallel build/serve of dist/ is not disturbed).
const dist = path.resolve(root, process.env.DEMO_OUT || 'dist');

const res = spawnSync('npx', ['expo', 'export', '-p', 'web', '--clear', '--output-dir', dist], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, EXPO_PUBLIC_DEMO: '1' },
});
if (res.status !== 0) process.exit(res.status ?? 1);

// Same default as app.config.js (experiments.baseUrl).
const base = (process.env.DEMO_BASE_URL || '/klg-synagogue').replace(/\/+$/, '');
const indexPath = path.join(dist, 'index.html');
const html = (await readFile(indexPath, 'utf8')).replace(
  /(<link\s+rel="(?:icon|apple-touch-icon|manifest)"\s+href=")\/(?!\/)/g,
  `$1${base}/`,
);
await writeFile(indexPath, html);
await copyFile(indexPath, path.join(dist, '404.html'));
await writeFile(path.join(dist, '.nojekyll'), '');
console.log('demo build: dist/ + 404.html + .nojekyll');
