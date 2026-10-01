import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Засев недельного шаблона молитв тем, что община публиковала сама.
 * Источники (страницы сайтов общины, коды — как в `// src:`):
 *   «Встреча шаббата. По пятницам в 19:00. Шахарит в шаббат. По субботам в 10:00.» — TL-comm (снимок 10.02.2025);
 *   «Миньян (утренняя молитва) — По Сб. в 10:00»; «Шабат (встреча Субботы) — По Пт. в 19:00» — OF-prak.
 * Встреча Шаббата (Каббалат Шаббат) записана в пятничный Маарив. Будни не найдены — пусто,
 * сайт честно пишет «уточняйте по телефону». Редактор правит шаблон в админке.
 * Меняем только нетронутый (пустой) шаблон.
 */
export class SeedScheduleTemplate1790000003000 implements MigrationInterface {
  name = 'SeedScheduleTemplate1790000003000';

  public async up(q: QueryRunner): Promise<void> {
    const empty = '{"shacharit": null, "mincha": null, "maariv": null}';
    await q.query(
      `UPDATE schedule_template
          SET friday = $2::jsonb, shabbat = $3::jsonb
        WHERE id = 1 AND friday = $1::jsonb AND shabbat = $1::jsonb`,
      [
        empty,
        '{"shacharit": null, "mincha": null, "maariv": "19:00"}',
        '{"shacharit": "10:00", "mincha": null, "maariv": null}',
      ]
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    const empty = '{"shacharit": null, "mincha": null, "maariv": null}';
    await q.query(
      `UPDATE schedule_template SET friday = $1::jsonb, shabbat = $1::jsonb WHERE id = 1`,
      [empty]
    );
  }
}
