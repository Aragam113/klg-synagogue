import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsOptional,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { LocalizedStringDto } from '@common/localization';
import type { ServiceTimes } from '../entities';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Время службы 'HH:MM' или null — службы нет. */
export class ServiceTimesDto implements ServiceTimes {
  @ApiProperty({ example: '09:00', nullable: true, type: String })
  @ValidateIf((_, v) => v !== null)
  @Matches(HHMM, { message: 'time' })
  shacharit: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  @ValidateIf((_, v) => v !== null)
  @Matches(HHMM, { message: 'time' })
  mincha: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  @ValidateIf((_, v) => v !== null)
  @Matches(HHMM, { message: 'time' })
  maariv: string | null;
}

/** Своё время отдельных будних дней (вс–чт); пустой день — действует «будни». */
export class WeekdayTimesDto {
  @ApiPropertyOptional({ type: ServiceTimesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceTimesDto)
  sun?: ServiceTimesDto;

  @ApiPropertyOptional({ type: ServiceTimesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceTimesDto)
  mon?: ServiceTimesDto;

  @ApiPropertyOptional({ type: ServiceTimesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceTimesDto)
  tue?: ServiceTimesDto;

  @ApiPropertyOptional({ type: ServiceTimesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceTimesDto)
  wed?: ServiceTimesDto;

  @ApiPropertyOptional({ type: ServiceTimesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceTimesDto)
  thu?: ServiceTimesDto;
}

export class ScheduleTemplateDto {
  @ApiProperty({ type: ServiceTimesDto, description: 'Воскресенье–четверг' })
  @IsDefined()
  @ValidateNested()
  @Type(() => ServiceTimesDto)
  weekday: ServiceTimesDto;

  @ApiProperty({ type: ServiceTimesDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ServiceTimesDto)
  friday: ServiceTimesDto;

  @ApiProperty({ type: ServiceTimesDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ServiceTimesDto)
  shabbat: ServiceTimesDto;

  @ApiPropertyOptional({
    type: WeekdayTimesDto,
    nullable: true,
    description:
      'Отдельные будние дни поверх weekday (например, миньян пн и чт); нет/null — weekday на все вс–чт',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WeekdayTimesDto)
  days?: WeekdayTimesDto | null;
}

/** Исключение на дату: свои времена (null — службы нет) и примечание. */
export class ScheduleOverrideDto extends ServiceTimesDto {
  @ApiPropertyOptional({ type: LocalizedStringDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  note?: LocalizedStringDto | null;
}
