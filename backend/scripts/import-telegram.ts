/**
 * Импорт новостей из публичного Telegram-канала синагоги в БД сайта.
 * Использование (из backend/): npm run import:telegram -- --since 2026-08-01 [--channel B_C_Kaliningrad]
 * Повторный запуск добавляет только новые посты (дубли отсекаются по ссылке на пост).
 */
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/shared/database/data-source';
import { importTelegram } from '../src/modules/content/telegram/telegram-import';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const since = arg('since');
  if (!since || !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    process.stderr.write(
      'Использование: npm run import:telegram -- --since YYYY-MM-DD [--channel имя]\n'
    );
    process.exit(1);
  }
  // без SQL-лога (в .env NODE_ENV=development включает его в data-source)
  const dataSource = new DataSource({ ...dataSourceOptions, logging: false });
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
    const r = await importTelegram(dataSource, {
      channel: arg('channel') ?? 'B_C_Kaliningrad',
      since,
      uploadDir: process.env.UPLOAD_DIR ?? './uploads',
      log: (m) => console.log(m),
    });
    console.log(
      `Готово: страниц ${r.pages}, постов за период ${r.posts}, добавлено ${r.created} ` +
        `(с альбомами ${r.withAlbums}, картинок ${r.images}, не скачалось ${r.imagesFailed}), уже были ${r.existing}; ` +
        `постов только с фото дописано ${r.photoPostsAppended}, пропущено ${r.photoPostsSkipped}`
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
