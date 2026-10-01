import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import type { PaymentPurpose, PaymentStatus } from '../entities';

/** Диапазон суммы, которую вводит посетитель. */
export const MIN_AMOUNT_RUB = 100;
export const MAX_AMOUNT_RUB = 1_000_000;

const blankToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

function OptionalText(max: number): PropertyDecorator {
  return (target, key) => {
    Transform(blankToUndefined)(target, key);
    IsOptional()(target, key);
    IsString()(target, key);
    MaxLength(max)(target, key);
  };
}

const PURPOSES: PaymentPurpose[] = ['donation', 'prayer', 'event'];

/** POST /payments. Сумму для event (и Кадиша с тарифом) считает сервер. */
export class CreatePaymentDto {
  @ApiProperty({ enum: PURPOSES })
  @IsIn(PURPOSES, { message: 'invalid_choice' })
  purpose: PaymentPurpose;

  @ApiPropertyOptional({ minimum: MIN_AMOUNT_RUB, maximum: MAX_AMOUNT_RUB })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_AMOUNT_RUB, { message: 'out_of_range' })
  @Max(MAX_AMOUNT_RUB, { message: 'out_of_range' })
  amountRub?: number;

  @OptionalText(200) fundraiserSlug?: string;

  @ValidateIf((o: CreatePaymentDto) => o.purpose === 'prayer')
  @IsNotEmpty({ message: 'required' })
  @IsUUID('4', { message: 'required' })
  requestId?: string;

  @ValidateIf((o: CreatePaymentDto) => o.purpose === 'event')
  @IsNotEmpty({ message: 'required' })
  @IsUUID('4', { message: 'required' })
  registrationId?: string;

  @IsOptional() @IsBoolean() recurring?: boolean;

  @IsBoolean() anonymous: boolean;

  @ValidateIf((o: CreatePaymentDto) => !o.anonymous)
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'required' })
  @MaxLength(200)
  donorName?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'required' })
  @MaxLength(254)
  @IsEmail()
  email: string;

  @OptionalText(50)
  @Matches(/^\+?[\d\s()-]{5,30}$/, { message: 'phone' })
  phone?: string;

  @OptionalText(2000) comment?: string;
  @OptionalText(500) dedication?: string;

  @ApiProperty({ example: true })
  @Equals(true)
  consent: boolean;
}

export class TokenQueryDto {
  @IsString() @IsNotEmpty() token: string;
}

export class DedicationsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

const STATUSES: PaymentStatus[] = ['pending', 'paid', 'canceled', 'failed'];

export class AdminPaymentsQueryDto {
  @IsOptional() @IsIn(PURPOSES) purpose?: PaymentPurpose;
  @IsOptional() @IsIn(STATUSES) status?: PaymentStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

export class PatchDedicationDto {
  @IsBoolean() visible: boolean;
}
