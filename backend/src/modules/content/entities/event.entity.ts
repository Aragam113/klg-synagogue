import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { LocalizedString } from '@common/localization';
import type { PublishStatus } from './news.entity';

/** Ступень цены: действует до даты until (YYYY-MM-DD, включительно); null — без срока. */
export interface PriceTier {
  until: string | null;
  priceRub: number;
}

@Entity('events')
@Check('CHK_events_capacity', `capacity IS NULL OR capacity > 0`)
@Check('CHK_events_status', `status IN ('draft', 'published')`)
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  slug: string;

  @Column({ type: 'jsonb' })
  title: LocalizedString;

  @Column({ type: 'jsonb' })
  description: LocalizedString;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cover: string | null;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  place: LocalizedString | null;

  @Column({ name: 'is_paid', type: 'boolean', default: false })
  isPaid: boolean;

  @Column({ name: 'price_tiers', type: 'jsonb', default: () => "'[]'" })
  priceTiers: PriceTier[];

  /** null — без лимита мест. */
  @Column({ type: 'int', nullable: true })
  capacity: number | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: PublishStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
