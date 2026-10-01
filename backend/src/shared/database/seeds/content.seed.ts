/**
 * Идемпотентные сиды контента: `npm run seed` (из backend/).
 * Повторный запуск ничего не дублирует и не затирает правки редактора:
 * сущность ищется по ru-заголовку, фото — по атрибуции, настройка — по ключу.
 */
import { DataSource } from 'typeorm';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import {
  AlbumEntity,
  DepartmentEntity,
  NewsEntity,
  PhotoEntity,
  ProgramEntity,
  SiteSettingEntity,
} from '@modules/content/entities';
import { saveImageAsWebp } from '@modules/content/uploads/image';
import { slugify } from '@modules/content/slug';
import { ALBUMS, DEPARTMENTS, NEWS, PROGRAMS, SETTINGS } from './content.data';

export interface SeedOptions {
  uploadDir: string;
  /** Папка с фото и `_sources.txt`; по умолчанию `backend/seed-assets/photos`. */
  imgDir?: string;
}

export interface SeedSummary {
  created: Record<string, number>;
}

const DEFAULT_IMG_DIR = resolve(__dirname, '../../../../seed-assets/photos');
const CREDIT_MAX = 300;

/** `_sources.txt`: «файл | лицензия | автор | дата | страница | описание» → атрибуция. */
async function readCredits(imgDir: string): Promise<Map<string, string>> {
  const text = await readFile(resolve(imgDir, '_sources.txt'), 'utf8');
  const credits = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('commons_')) continue;
    const [file, license, author, , page] = line
      .split(' | ')
      .map((s) => s.trim());
    if (!page?.startsWith('https://commons.wikimedia.org/')) continue;
    if (!/^(CC|Public domain)/.test(license)) continue;
    let url = page;
    try {
      url = decodeURI(page);
    } catch {
      /* оставляем закодированную ссылку */
    }
    const tail = ` / ${license} / Wikimedia Commons: ${url}`;
    const who = author.slice(0, Math.max(20, CREDIT_MAX - tail.length));
    credits.set(file, `${who}${tail}`.slice(0, CREDIT_MAX));
  }
  return credits;
}

export async function seedContent(
  ds: DataSource,
  opts: SeedOptions
): Promise<SeedSummary> {
  const imgDir = opts.imgDir ?? DEFAULT_IMG_DIR;
  const created: Record<string, number> = {
    programs: 0,
    departments: 0,
    news: 0,
    albums: 0,
    photos: 0,
    settings: 0,
  };
  const byRuTitle = async (table: string, ru: string) =>
    (
      await ds.query(
        `SELECT id FROM ${table} WHERE title->>'ru' = $1 LIMIT 1`,
        [ru]
      )
    )[0] as { id: string } | undefined;

  const programs = ds.getRepository(ProgramEntity);
  for (const [i, p] of PROGRAMS.entries()) {
    if (await byRuTitle('programs', p.title.ru)) continue;
    await programs.save(
      programs.create({
        ...p,
        cover: null,
        sort: (i + 1) * 10,
        published: true,
      })
    );
    created.programs++;
  }

  const departments = ds.getRepository(DepartmentEntity);
  for (const [i, d] of DEPARTMENTS.entries()) {
    if (await byRuTitle('departments', d.title.ru)) continue;
    await departments.save(
      departments.create({
        ...d,
        cover: null,
        sort: (i + 1) * 10,
        published: true,
      })
    );
    created.departments++;
  }

  const credits = await readCredits(imgDir);
  const albums = ds.getRepository(AlbumEntity);
  const photos = ds.getRepository(PhotoEntity);
  for (const [i, a] of ALBUMS.entries()) {
    let album = await albums.findOne({ where: { slug: slugify(a.title.ru) } });
    if (!album) {
      album = await albums.save(
        albums.create({
          slug: slugify(a.title.ru),
          title: a.title,
          cover: null,
          sort: (i + 1) * 10,
        })
      );
      created.albums++;
    }
    for (const [j, p] of a.photos.entries()) {
      const credit = credits.get(p.file);
      if (!credit)
        throw new Error(`Нет свободной лицензии в _sources.txt для ${p.file}`);
      if (await photos.findOne({ where: { albumId: album.id, credit } }))
        continue;
      const { url: file } = await saveImageAsWebp(
        await readFile(resolve(imgDir, p.file)),
        opts.uploadDir
      );
      await photos.save(
        photos.create({
          albumId: album.id,
          file,
          caption: p.caption,
          credit,
          sort: (j + 1) * 10,
        })
      );
      created.photos++;
      if (!album.cover) {
        album.cover = file;
        await albums.save(album);
      }
    }
  }

  // Новости — после альбомов: обложка берётся из уже засеянного Commons-фото (тот же webp).
  const news = ds.getRepository(NewsEntity);
  for (const n of NEWS) {
    const credit = credits.get(n.coverPhoto);
    if (!credit)
      throw new Error(
        `Нет свободной лицензии в _sources.txt для ${n.coverPhoto}`
      );
    const photo = await photos.findOne({ where: { credit } });
    if (!photo)
      throw new Error(`Обложка ${n.coverPhoto} не засеяна ни в один альбом`);
    const attribution = `Фото: ${credit}`;
    const existing = await byRuTitle('news', n.title.ru);
    if (existing) {
      // Правки редактора не трогаем: обложку ставим, только если её нет.
      const row = await news.findOne({ where: { id: existing.id } });
      if (row && !row.cover) {
        row.cover = photo.file;
        if (!row.body.ru.includes(attribution))
          row.body = {
            ...row.body,
            ru: `${row.body.ru}

${attribution}`,
          };
        await news.save(row);
      }
      continue;
    }
    await news.save(
      news.create({
        slug: slugify(n.title.ru),
        title: n.title,
        lead: n.lead,
        body: {
          ...n.body,
          ru: `${n.body.ru}

${attribution}`,
        },
        cover: photo.file,
        kind: 'news',
        status: 'published',
        publishedAt: new Date(n.publishedAt),
      })
    );
    created.news++;
  }

  const settings = ds.getRepository(SiteSettingEntity);
  for (const [key, value] of Object.entries(SETTINGS)) {
    if (value === null || (await settings.findOne({ where: { key } })))
      continue;
    await settings.save(settings.create({ key, value }));
    created.settings++;
  }

  return { created };
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: dataSource } = require('../data-source') as {
    default: DataSource;
  };
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
    const { created } = await seedContent(dataSource, {
      uploadDir: process.env.UPLOAD_DIR ?? './uploads',
    });
    console.log('Сиды контента: добавлено', created);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
