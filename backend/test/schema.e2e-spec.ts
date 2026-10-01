import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers';

describe('Схема БД (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('сущности совпадают с накатанными миграциями: schema builder ничего не хочет менять', async () => {
    const log = await app.get(DataSource).driver.createSchemaBuilder().log();
    expect(log.upQueries.map((q) => q.query)).toEqual([]);
  });
});
