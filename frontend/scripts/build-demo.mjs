#!/usr/bin/env node
/**
 * GitHub Pages demo build: `npm run build:demo` =
 * `EXPO_PUBLIC_DEMO=1 npx expo export -p web` + SPA fallback `dist/404.html` (copy of index.html) + `dist/.nojekyll`.
 * Needs no backend: the API is answered from the committed snapshot `public/demo-data/` (`npm run demo:snapshot`).
 */
import { spawnSync } from 'node:child_process';
import { copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const res = spawnSync('npx', ['expo', 'export', '-p', 'web', '--clear'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, EXPO_PUBLIC_DEMO: '1' },
});
if (res.status !== 0) process.exit(res.status ?? 1);

await copyFile(path.join(dist, 'index.html'), path.join(dist, '404.html'));
await writeFile(path.join(dist, '.nojekyll'), '');
console.log('demo build: dist/ + 404.html + .nojekyll');
