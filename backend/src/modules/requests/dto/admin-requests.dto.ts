import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const REQUEST_TYPES = [
  'prayer',
  'excursion',
  'appointment',
  'rabbi_question',
  'help',
  'volunteer',
] as const;
export const REQUEST_STATUSES = [
  'new',
  'in_progress',
  'done',
  'rejected',
] as const;
export const REGISTRATION_STATUSES = ['new', 'confirmed', 'canceled'] as const;

export class AdminRequestsQueryDto {
  @ApiPropertyOptional({ enum: REQUEST_TYPES })
  @IsOptional()
  @IsIn(REQUEST_TYPES)
  type?: (typeof REQUEST_TYPES)[number];

  @ApiPropertyOptional({ enum: REQUEST_STATUSES })
  @IsOptional()
  @IsIn(REQUEST_STATUSES)
  status?: (typeof REQUEST_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class PatchRequestDto {
  @ApiPropertyOptional({ enum: REQUEST_STATUSES })
  @IsOptional()
  @IsIn(REQUEST_STATUSES)
  status?: (typeof REQUEST_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  adminNote?: string;
}

export class PatchRegistrationDto {
  @IsIn(REGISTRATION_STATUSES)
  status: (typeof REGISTRATION_STATUSES)[number];
}

export class YahrzeitsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(366)
  days?: number;
}
