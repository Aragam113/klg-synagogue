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
}

/** Исключение на дату: свои времена (null — службы нет) и примечание. */
export class ScheduleOverrideDto extends ServiceTimesDto {
  @ApiPropertyOptional({ type: LocalizedStringDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  note?: LocalizedStringDto | null;
}
