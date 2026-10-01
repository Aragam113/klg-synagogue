import { MigrationInterface, QueryRunner } from 'typeorm';

/** Новости: галерея картинок поста и ссылка на исходный пост (импорт из Telegram). */
export class NewsImagesSource1790000011000 implements MigrationInterface {
  name = 'NewsImagesSource1790000011000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE news
        ADD COLUMN images jsonb NOT NULL DEFAULT '[]',
        ADD COLUMN source_url text CONSTRAINT "UQ_news_source_url" UNIQUE
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE news DROP COLUMN source_url, DROP COLUMN images`
    );
  }
}
