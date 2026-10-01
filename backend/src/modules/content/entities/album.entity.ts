import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { LocalizedString } from '@common/localization';
import { PhotoEntity } from './photo.entity';

@Entity('albums')
export class AlbumEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  slug: string;

  @Column({ type: 'jsonb' })
  title: LocalizedString;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cover: string | null;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => PhotoEntity, (p) => p.album)
  photos?: PhotoEntity[];
}
