import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Настройки сайта ключ-значение (supporters_offset, реквизиты, тариф Кадиша, ...). */
@Entity('site_settings')
export class SiteSettingEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'jsonb' })
  value: unknown;
}
