import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { LocalizedString } from '@common/localization';

export type FundraiserStatus = 'active' | 'closed';

@Entity('fundraisers')
@Check('CHK_fundraisers_status', `status IN ('active', 'closed')`)
export class FundraiserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  slug: string;

  @Column({ type: 'jsonb' })
  title: LocalizedString;

  @Column({ type: 'jsonb' })
  body: LocalizedString;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cover: string | null;

  /** null — сбор без суммы-цели. */
  @Column({ name: 'goal_rub', type: 'int', nullable: true })
  goalRub: number | null;

  @Column({ name: 'raised_rub', type: 'int', default: 0 })
  raisedRub: number;

  @Column({ type: 'int', default: 0 })
  supporters: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: FundraiserStatus;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
