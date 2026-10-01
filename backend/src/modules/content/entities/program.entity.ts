import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { LocalizedString } from '@common/localization';

@Entity('programs')
export class ProgramEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  title: LocalizedString;

  @Column({ type: 'jsonb', nullable: true })
  audience: LocalizedString | null;

  /** Когда проходит — свободный текст. */
  @Column({ type: 'jsonb', nullable: true })
  schedule: LocalizedString | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  contact: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cover: string | null;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'boolean', default: false })
  published: boolean;
}
