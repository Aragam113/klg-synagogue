// sharp 0.35 отдаёт типы ESM (`export default`), а в CommonJS-сборке require('sharp')
// возвращает саму функцию: без esModuleInterop `import sharp from 'sharp'` ломается в рантайме.
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const sharp = require('sharp') as typeof import('sharp').default;
