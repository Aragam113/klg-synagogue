import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Недельный шаблон: своё время отдельных будних дней (`days`: sun…thu) поверх «будней» (вс–чт).
 * Засев: утренний миньян по понедельникам и четвергам в 9:00 — анонс общины в Telegram 28.09.2026
 * (https://t.me/B_C_Kaliningrad/2216: «кроме постоянных молитв в пятницу и субботу… миньян по понедельникам
 * и четвергам… 🕘 9:00, после молитвы — завтрак»). На Chabad.org и сайте ФЕОР расписания служб общины нет —
 * там только зманим. Пишем только в нетронутый шаблон (будни пустые, своих дней нет); редактор правит в админке.
 */
export class ScheduleWeekdays1790000012000 implements MigrationInterface {
  name = 'ScheduleWeekdays1790000012000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE schedule_template ADD COLUMN days jsonb DEFAULT NULL`
    );
    const empty = '{"shacharit": null, "mincha": null, "maariv": null}';
    const minyan = { shacharit: '09:00', mincha: null, maariv: null };
    await q.query(
      `UPDATE schedule_template SET days = $2::jsonb
        WHERE id = 1 AND days IS NULL AND weekday = $1::jsonb`,
      [empty, JSON.stringify({ mon: minyan, thu: minyan })]
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE schedule_template DROP COLUMN days`);
  }
}
