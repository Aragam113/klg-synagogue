import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { LocalizedString } from '@common/localization';

/** Исключение расписания на дату (праздник, отмена, примечание); null — службы нет. */
@Entity('schedule_overrides')
export class ScheduleOverrideEntity {
  /** YYYY-MM-DD */
  @PrimaryColumn({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  shacharit: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  mincha: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  maariv: string | null;

  @Column({ type: 'jsonb', nullable: true })
  note: LocalizedString | null;
}
