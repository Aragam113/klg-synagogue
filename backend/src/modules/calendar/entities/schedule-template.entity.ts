import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

/** Время службы 'HH:MM' или null — службы нет. */
export interface ServiceTimes {
  shacharit: string | null;
  mincha: string | null;
  maariv: string | null;
}

/** Дни, которым можно задать своё время поверх «будней» (вс–чт). */
export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu'] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];
/** Своё время отдельных будних дней (например, миньян по понедельникам и четвергам). */
export type WeekdayTimes = Partial<Record<WeekdayKey, ServiceTimes>>;

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

  /**
   * Отдельные будние дни: строка дня с хоть одним временем заменяет `weekday` в этот день недели;
   * null / нет ключа — действует `weekday`.
   */
  @Column({ type: 'jsonb', nullable: true, default: null })
  days: WeekdayTimes | null;
}
