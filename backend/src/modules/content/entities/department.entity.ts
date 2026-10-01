import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { LocalizedString } from '@common/localization';

@Entity('departments')
export class DepartmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  title: LocalizedString;

  @Column({ type: 'jsonb', nullable: true })
  description: LocalizedString | null;

  @Column({ type: 'jsonb', nullable: true })
  address: LocalizedString | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  phones: string[];

  @Column({ type: 'varchar', length: 254, nullable: true })
  email: string | null;

  @Column({ type: 'jsonb', nullable: true })
  hours: LocalizedString | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cover: string | null;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'boolean', default: false })
  published: boolean;
}
