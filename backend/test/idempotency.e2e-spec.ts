import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { createIdempotent } from '../src/common/forms';
import { RequestEntity } from '../src/modules/requests/entities';
import { createTestApp, resetDb } from './helpers';

describe('createIdempotent (e2e, настоящая БД)', () => {
  let app: INestApplication;
  let repo: Repository<RequestEntity>;

  const save = (key: string | null, name: string) => () =>
    repo.save(
      repo.create({
        type: 'help',
        contactName: name,
        payload: {},
        idempotencyKey: key,
      })
    );

  beforeAll(async () => {
    app = await createTestApp();
    repo = app.get(DataSource).getRepository(RequestEntity);
  });
  beforeEach(async () => {
    await resetDb(app);
  });
  afterAll(async () => {
    await app.close();
  });

  it('тот же ключ → та же запись и created:false, вторая не создаётся', async () => {
    const first = await createIdempotent(repo, 'key-1', save('key-1', 'Анна'));
    const again = await createIdempotent(repo, 'key-1', save('key-1', 'Борис'));
    expect(first.created).toBe(true);
    expect(again).toEqual({
      entity: expect.objectContaining({
        id: first.entity.id,
        contactName: 'Анна',
      }),
      created: false,
    });
    expect(await repo.count()).toBe(1);
  });

  it('без ключа — каждый вызов создаёт новую запись', async () => {
    await createIdempotent(repo, null, save(null, 'Анна'));
    await createIdempotent(repo, null, save(null, 'Анна'));
    expect(await repo.count()).toBe(2);
  });

  it('параллельная гонка с одним ключом → одна запись, все получают её', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createIdempotent(repo, 'race', save('race', `Гость ${i}`))
      )
    );
    expect(await repo.count()).toBe(1);
    const ids = new Set(results.map((r) => r.entity.id));
    expect(ids.size).toBe(1);
    expect(results.filter((r) => r.created)).toHaveLength(1);
  });

  it('конкурент вставил запись между проверкой и вставкой → unique violation, отдаётся запись конкурента', async () => {
    let winnerId = '';
    const res = await createIdempotent(repo, 'race-2', async () => {
      // «Параллельный» запрос успел сохранить запись с тем же ключом.
      winnerId = (await save('race-2', 'Победитель')()).id;
      return save('race-2', 'Проигравший')();
    });
    expect(res).toEqual({
      entity: expect.objectContaining({
        id: winnerId,
        contactName: 'Победитель',
      }),
      created: false,
    });
    expect(await repo.count()).toBe(1);
  });

  it('resetDb очищает и таблицу, которой нет в списке хелпера (новая миграция)', async () => {
    const db = app.get(DataSource);
    await db.query('CREATE TABLE IF NOT EXISTS reset_probe (id int)');
    try {
      await db.query('INSERT INTO reset_probe VALUES (1)');
      await resetDb(app);
      const [{ n }] = await db.query(
        'SELECT count(*)::int AS n FROM reset_probe'
      );
      expect(n).toBe(0);
    } finally {
      await db.query('DROP TABLE reset_probe');
    }
  });
});
