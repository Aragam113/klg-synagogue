import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { MEDIA_PREFIX } from '../../../app.setup';
import { sharp } from './sharp';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_SIDE = 2000;
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];

export interface SavedImage {
  /** Публичный путь /media/<имя>.webp. */
  url: string;
  width: number;
  height: number;
}

/** Картинка → webp ≤ 2000px в UPLOAD_DIR; размеры — уже сохранённого файла. */
export async function saveImageAsWebp(
  input: Buffer,
  uploadDir: string
): Promise<SavedImage> {
  let meta: { format?: string };
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new BadRequestException({
      message: 'Файл не является изображением',
      fields: { file: 'not_image' },
    });
  }
  if (!meta.format || !ALLOWED_FORMATS.includes(meta.format)) {
    throw new BadRequestException({
      message: 'Допустимы JPG, PNG, WebP',
      fields: { file: 'not_image' },
    });
  }
  const dir = resolve(uploadDir);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.webp`;
  const info = await sharp(input)
    .rotate()
    .resize({
      width: MAX_IMAGE_SIDE,
      height: MAX_IMAGE_SIDE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toFile(join(dir, name));
  return {
    url: `${MEDIA_PREFIX}/${name}`,
    width: info.width,
    height: info.height,
  };
}
