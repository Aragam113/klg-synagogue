import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

/** Время службы 'HH:MM' или null — службы нет. */
export interface ServiceTimes {
  shacharit: string | null;
  mincha: string | null;
  maariv: string | null;
}

/** Недельный шаблон расписания молитв — единственная строка id=1 (создаётся миграцией). */
@Entity('schedule_template')
@Check('CHK_schedule_template_single', `id = 1`)
export class ScheduleTemplateEntity {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({ type: 'jsonb' })
  weekday: ServiceTimes;

  @Column({ type: 'jsonb' })
  friday: ServiceTimes;

  @Column({ type: 'jsonb' })
  shabbat: ServiceTimes;
}
