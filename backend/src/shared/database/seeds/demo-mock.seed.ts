/**
 * Демо-афиша и демо-сборы: `npm run seed:demo` (из backend/), убрать — `npm run seed:demo -- --remove`.
 * Идемпотентно: записи ищутся по slug `demo-*` и перезаписываются целиком (даты пересчитываются от «сегодня»),
 * демо-платежи — по idempotency_key `demo-*`. Обложки — уже засеянные фото Commons (`npm run seed`) с атрибуцией.
 */
import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import {
  EventEntity,
  FundraiserEntity,
  PhotoEntity,
} from '@modules/content/entities';
import { PaymentEntity } from '@modules/payments/entities';
import { readCredits } from './content.seed';
import { DEMO_PREFIX, demoPlan } from './demo-mock.data';

export interface DemoSummary {
  events: number;
  fundraisers: number;
  payments: number;
}

const attributionOf = async (
  ds: DataSource,
  credits: Map<string, string>,
  file: string
) => {
  const credit = credits.get(file);
  if (!credit)
    throw new Error(`Нет свободной лицензии в _sources.txt для ${file}`);
  const photo = await ds
    .getRepository(PhotoEntity)
    .findOne({ where: { credit } });
  if (!photo) throw new Error(`Фото ${file} не засеяно — сначала npm run seed`);
  return { cover: photo.file, line: `Фото: ${credit}` };
};

export async function seedDemo(
  ds: DataSource,
  now = new Date()
): Promise<DemoSummary> {
  const plan = demoPlan(now);
  const credits = await readCredits();
  const events = ds.getRepository(EventEntity);
  const funds = ds.getRepository(FundraiserEntity);
  const payments = ds.getRepository(PaymentEntity);

  for (const e of plan.events) {
    const { cover, line } = await attributionOf(ds, credits, e.coverPhoto);
    const row =
      (await events.findOne({ where: { slug: e.slug } })) ??
      events.create({ slug: e.slug });
    Object.assign(row, {
      title: e.title,
      description: { ...e.description, ru: `${e.description.ru}\n\n${line}` },
      place: e.place,
      cover,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      isPaid: e.isPaid,
      priceTiers: e.priceTiers,
      capacity: e.capacity,
      status: 'published',
    });
    await events.save(row);
  }
  // праздник мог смениться (другой ближайший) — лишние демо-события убираем
  await ds.query(
    `DELETE FROM events WHERE slug LIKE 'demo-%' AND NOT (slug = ANY($1))`,
    [plan.events.map((e) => e.slug)]
  );

  let paid = 0;
  for (const f of plan.fundraisers) {
    const { cover, line } = await attributionOf(ds, credits, f.coverPhoto);
    const row =
      (await funds.findOne({ where: { slug: f.slug } })) ??
      funds.create({ slug: f.slug });
    Object.assign(row, {
      title: f.title,
      body: { ...f.body, ru: `${f.body.ru}\n\n${line}` },
      cover,
      goalRub: f.goalRub,
      raisedRub: f.raisedRub,
      supporters: f.supporters,
      status: f.status,
      endsAt: f.endsAt,
    });
    const saved = await funds.save(row);
    for (const [i, amountRub] of f.payments.entries()) {
      const key = `${f.slug}-${i + 1}`;
      if (await payments.findOne({ where: { idempotencyKey: key } })) continue;
      const paidAt = new Date(now.getTime() - (i + 1) * 3 * 86_400_000);
      await payments.save(
        payments.create({
          purpose: 'donation',
          amountRub,
          fundraiserId: saved.id,
          donorName: null,
          anonymous: true,
          comment: 'demo',
          dedication: null,
          dedicationVisible: false,
          recurring: false,
          status: 'paid',
          providerPaymentId: `demo-${randomBytes(8).toString('hex')}`,
          accessToken: randomBytes(24).toString('hex'),
          idempotencyKey: key,
          paidAt,
        })
      );
      paid++;
    }
  }
  return {
    events: plan.events.length,
    fundraisers: plan.fundraisers.length,
    payments: paid,
  };
}

export async function removeDemo(ds: DataSource): Promise<DemoSummary> {
  const like = `${DEMO_PREFIX}%`;
  const [, p] = await ds.query(
    `DELETE FROM payments WHERE idempotency_key LIKE $1`,
    [like]
  );
  const [, e] = await ds.query(`DELETE FROM events WHERE slug LIKE $1`, [like]);
  const [, f] = await ds.query(`DELETE FROM fundraisers WHERE slug LIKE $1`, [
    like,
  ]);
  return { events: Number(e), fundraisers: Number(f), payments: Number(p) };
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: dataSource } = require('../data-source') as {
    default: DataSource;
  };
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
    if (process.argv.includes('--remove')) {
      console.log('Демо-моки удалены:', await removeDemo(dataSource));
    } else {
      console.log(
        'Демо-моки (афиша, сборы, платежи):',
        await seedDemo(dataSource)
      );
    }
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
