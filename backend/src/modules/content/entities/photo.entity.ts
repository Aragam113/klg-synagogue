import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { LocalizedString } from '@common/localization';
import { AlbumEntity } from './album.entity';

@Entity('photos')
export class PhotoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_photos_album_id')
  @Column({ name: 'album_id', type: 'uuid' })
  albumId: string;

  @ManyToOne(() => AlbumEntity, (a) => a.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'album_id', foreignKeyConstraintName: 'FK_photos_album' })
  album?: AlbumEntity;

  /** URL файла (/media/...). */
  @Column({ type: 'varchar', length: 500 })
  file: string;

  @Column({ type: 'jsonb', nullable: true })
  caption: LocalizedString | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  credit: string | null;

  @Column({ type: 'int', default: 0 })
  sort: number;
}
