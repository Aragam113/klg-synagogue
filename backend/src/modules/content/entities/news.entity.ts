import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { LocalizedString } from '@common/localization';

export type NewsKind = 'news' | 'announcement';
export type PublishStatus = 'draft' | 'published';

/** Картинка галереи новости (альбом поста). */
export interface NewsImage {
  url: string;
  width?: number;
  height?: number;
  /** Пост Telegram, из которого картинка (импорт; наружу не отдаётся). */
  source?: string;
}

@Entity('news')
@Check('CHK_news_kind', `kind IN ('news', 'announcement')`)
@Check('CHK_news_status', `status IN ('draft', 'published')`)
export class NewsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  slug: string;

  @Column({ type: 'jsonb' })
  title: LocalizedString;

  @Column({ type: 'jsonb', nullable: true })
  lead: LocalizedString | null;

  @Column({ type: 'jsonb' })
  body: LocalizedString;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cover: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  images: NewsImage[];

  /** Ссылка на исходный пост (импорт из Telegram); по ней импорт идемпотентен. */
  @Column({ name: 'source_url', type: 'text', nullable: true, unique: true })
  sourceUrl: string | null;

  @Column({ type: 'varchar', length: 20, default: 'news' })
  kind: NewsKind;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: PublishStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
