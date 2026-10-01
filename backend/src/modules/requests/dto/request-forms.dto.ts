import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateBy,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/** '' и пробелы в необязательном поле = поле не заполнено. */
const blankToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const PHONE = /^\+?[\d\s()-]{5,30}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD и такая дата существует в календаре (2026-02-31 — нет). */
function isRealDate(value: unknown): boolean {
  if (typeof value !== 'string' || !DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function RequiredText(max = 200): PropertyDecorator {
  return (target, key) => {
    Transform(trim)(target, key);
    IsString()(target, key);
    IsNotEmpty()(target, key);
    MaxLength(max)(target, key);
  };
}

function OptionalText(max = 200): PropertyDecorator {
  return (target, key) => {
    Transform(blankToUndefined)(target, key);
    IsOptional()(target, key);
    IsString()(target, key);
    MaxLength(max)(target, key);
  };
}

function RequiredPhone(): PropertyDecorator {
  return (target, key) => {
    RequiredText(50)(target, key);
    Matches(PHONE, { message: 'phone' })(target, key);
  };
}

function OptionalPhone(): PropertyDecorator {
  return (target, key) => {
    OptionalText(50)(target, key);
    Matches(PHONE, { message: 'phone' })(target, key);
  };
}

function RequiredEmail(): PropertyDecorator {
  return (target, key) => {
    RequiredText(254)(target, key);
    IsEmail()(target, key);
  };
}

function OptionalEmail(): PropertyDecorator {
  return (target, key) => {
    OptionalText(254)(target, key);
    IsEmail()(target, key);
  };
}

/** Дата YYYY-MM-DD (существующая). */
function DateField(required: boolean): PropertyDecorator {
  return (target, key) => {
    if (required) RequiredText(10)(target, key);
    else OptionalText(10)(target, key);
    ValidateBy(
      { name: 'isRealDate', validator: { validate: isRealDate } },
      { message: 'date' }
    )(target, key);
  };
}

/** Целое в диапазоне; вне — `out_of_range`. */
function IntRange(min: number, max: number): PropertyDecorator {
  return (target, key) => {
    Type(() => Number)(target, key);
    IsInt()(target, key);
    Min(min, { message: 'out_of_range' })(target, key);
    Max(max, { message: 'out_of_range' })(target, key);
  };
}

/** Обязательное согласие на обработку ПДн: только `true`. */
function Consent(): PropertyDecorator {
  return (target, key) => {
    ApiProperty({ example: true })(target, key);
    Equals(true)(target, key);
  };
}

export const PRAYER_TYPES = [
  'misheberah',
  'kaddish',
  'yahrzeit',
  'yizkor',
] as const;
export type PrayerType = (typeof PRAYER_TYPES)[number];
export const YIZKOR_DAYS = [
  'yom_kippur',
  'shmini_atzeret',
  'pesach',
  'shavuot',
] as const;

const isPrayer =
  (...types: PrayerType[]) =>
  (o: PrayerRequestDto) =>
    types.includes(o.prayerType);

/** Заказ молитвы: общий блок заказчика + поля по виду молитвы. */
export class PrayerRequestDto {
  @ApiProperty({ enum: PRAYER_TYPES })
  @IsIn(PRAYER_TYPES)
  prayerType: PrayerType;

  @RequiredText(100) lastName: string;
  @RequiredText(100) firstName: string;
  @OptionalText(100) middleName?: string;
  @RequiredEmail() email: string;
  @OptionalPhone() phone?: string;

  // Мишеберах
  @ValidateIf(isPrayer('misheberah')) @RequiredText(100) forName?: string;
  @ValidateIf(isPrayer('misheberah')) @RequiredText(100) motherName?: string;
  @ValidateIf(isPrayer('misheberah')) @IntRange(1, 5) times?: number;

  // Кадиш, Йорцайт, Изкор
  @ValidateIf(isPrayer('kaddish', 'yahrzeit', 'yizkor'))
  @RequiredText(100)
  deceasedName?: string;

  @ValidateIf(isPrayer('kaddish', 'yahrzeit', 'yizkor'))
  @RequiredText(100)
  fatherName?: string;

  @ValidateIf(isPrayer('kaddish', 'yahrzeit'))
  @DateField(true)
  deathDate?: string;

  @ValidateIf(isPrayer('kaddish')) @IntRange(1, 11) months?: number;

  @IsOptional() @IsBoolean() remind?: boolean;
  @IsOptional() @IsBoolean() remindByEmail?: boolean;
  @IsOptional() @IsBoolean() remindByPhone?: boolean;

  @ValidateIf(isPrayer('yizkor'))
  @ApiPropertyOptional({ enum: YIZKOR_DAYS })
  @IsIn(YIZKOR_DAYS)
  yizkor?: (typeof YIZKOR_DAYS)[number];

  @Consent() consent: boolean;
}

/** Виды экскурсий (источник OF-tour): по расписанию и индивидуальная. */
export const EXCURSION_KINDS = ['scheduled', 'individual'] as const;
/**
 * Языки экскурсий (источник VK-mus: «на русском, немецком и английском»).
 * Зеркалит frontend/src/forms/facts.ts → EXCURSION.languages: меняешь здесь — поменяй и там.
 */
export const EXCURSION_LANGS = ['ru', 'de', 'en'] as const;
/**
 * Начала экскурсий по расписанию (источник OF-tour, снимок 16.06.2026).
 * Зеркалит frontend/src/forms/facts.ts → EXCURSION.times: меняешь здесь — поменяй и там.
 */
export const EXCURSION_TIMES = [
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
] as const;

/** Запись на экскурсию. */
export class ExcursionRequestDto {
  @RequiredText(200) name: string;
  @RequiredPhone() phone: string;
  @OptionalEmail() email?: string;
  @DateField(true) date: string;

  @Transform(blankToUndefined)
  @IsOptional()
  @IsIn(EXCURSION_TIMES)
  time?: string;

  @IntRange(1, 50) people: number;

  @Transform(blankToUndefined)
  @IsOptional()
  @IsIn(EXCURSION_LANGS)
  language?: string;

  @Transform(blankToUndefined)
  @IsOptional()
  @IsIn(EXCURSION_KINDS)
  kind?: string;

  @OptionalText(2000) comment?: string;
  @Consent() consent: boolean;
}

export const APPOINTMENT_TO = ['rabbi', 'chairman'] as const;

/** Вопрос раввину. */
export class RabbiQuestionDto {
  @RequiredText(200) name: string;
  @RequiredPhone() phone: string;
  @OptionalEmail() email?: string;
  @RequiredText(200) topic: string;
  @RequiredText(5000) text: string;
  @Consent() consent: boolean;
}

/** Запись на приём к раввину или руководителю общины. */
export class AppointmentRequestDto extends RabbiQuestionDto {
  @ApiProperty({ enum: APPOINTMENT_TO })
  @IsIn(APPOINTMENT_TO)
  to: (typeof APPOINTMENT_TO)[number];
}

export const HELP_KINDS = [
  'spiritual',
  'medical',
  'material',
  'question',
] as const;
export const ROOTS = ['both', 'mother', 'father', 'no'] as const;

/** Обращение за помощью: вид помощи, корни, контакты, описание. */
export class HelpRequestDto {
  @IsIn(HELP_KINDS) kind: (typeof HELP_KINDS)[number];
  @RequiredText(200) fullName: string;
  @RequiredPhone() phone: string;
  @RequiredEmail() email: string;
  @DateField(true) birthDate: string;
  @RequiredText(500) address: string;

  @Transform(blankToUndefined)
  @IsOptional()
  @IsIn(ROOTS)
  roots?: string;

  @RequiredText(5000) situation: string;
  @RequiredText(2000) otherHelp: string;
  @RequiredText(5000) question: string;
  @Consent() consent: boolean;
}

export const VOLUNTEER_AREAS = [
  'meals',
  'holidays',
  'delivery',
  'it',
  'other',
] as const;

/** Анкета волонтёра. */
export class VolunteerRequestDto {
  @RequiredText(200) name: string;
  @RequiredPhone() phone: string;
  @OptionalEmail() email?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(VOLUNTEER_AREAS.length)
  @IsIn(VOLUNTEER_AREAS, { each: true })
  areas?: string[];

  @OptionalText(1000) availability?: string;
  @Consent() consent: boolean;
}

/** Регистрация на событие. */
export class EventRegistrationDto {
  @RequiredText(200) name: string;
  @RequiredPhone() phone: string;
  @OptionalEmail() email?: string;
  @IntRange(1, 20) seats: number;
  @Consent() consent: boolean;
}

/** Подписка на рассылку. */
export class SubscribeDto {
  @RequiredText(200) name: string;
  @RequiredEmail() email: string;
  @IsOptional() @IsBoolean() livesInCity?: boolean;
  @Consent() consent: boolean;
}
