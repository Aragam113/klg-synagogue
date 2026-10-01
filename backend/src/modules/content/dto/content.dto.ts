import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEmail,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { LocalizedStringDto } from '@common/localization';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Путь к файлу: /media/... из POST /admin/uploads или внешний https-URL. */
const FILE_URL = /^(\/media\/|https?:\/\/)\S+$/;

class SlugAndCover {
  @ApiPropertyOptional({ description: 'По умолчанию — транслит ru-заголовка' })
  @IsOptional()
  @Matches(SLUG)
  @MaxLength(200)
  slug?: string;

  @ApiPropertyOptional({ example: '/media/abc.webp', nullable: true })
  @IsOptional()
  @Matches(FILE_URL)
  @MaxLength(500)
  cover?: string | null;
}

export class CreateNewsDto extends SlugAndCover {
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  title: LocalizedStringDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  lead?: LocalizedStringDto | null;

  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  body: LocalizedStringDto;

  @ApiPropertyOptional({ enum: ['news', 'announcement'] })
  @IsOptional()
  @IsIn(['news', 'announcement'])
  kind?: 'news' | 'announcement';

  @ApiPropertyOptional({ enum: ['draft', 'published'] })
  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';

  @ApiPropertyOptional({ description: 'По умолчанию — момент публикации' })
  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;
}
export class UpdateNewsDto extends PartialType(CreateNewsDto) {}

export class PriceTierDto {
  @ApiPropertyOptional({ example: '2026-12-01', nullable: true })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date' })
  until: string | null;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(1)
  priceRub: number;
}

export class CreateEventDto extends SlugAndCover {
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  title: LocalizedStringDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  description: LocalizedStringDto;

  @ApiProperty({ example: '2026-12-14T17:00:00+02:00' })
  @IsDefined()
  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  place?: LocalizedStringDto | null;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ type: [PriceTierDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PriceTierDto)
  priceTiers?: PriceTierDto[];

  @ApiPropertyOptional({ nullable: true, description: 'null — без лимита' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number | null;

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';
}
export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class CreateFundraiserDto extends SlugAndCover {
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  title: LocalizedStringDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  body: LocalizedStringDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  goalRub?: number | null;

  @ApiPropertyOptional({
    description: 'Ручная корректировка (наличные и т.п.)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  raisedRub?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  supporters?: number;

  @IsOptional()
  @IsIn(['active', 'closed'])
  status?: 'active' | 'closed';

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;
}
export class UpdateFundraiserDto extends PartialType(CreateFundraiserDto) {}

export class CreateProgramDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  title: LocalizedStringDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  audience?: LocalizedStringDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  schedule?: LocalizedStringDto | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  contact?: string | null;

  @IsOptional()
  @Matches(FILE_URL)
  @MaxLength(500)
  cover?: string | null;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
export class UpdateProgramDto extends PartialType(CreateProgramDto) {}

export class CreateDepartmentDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  title: LocalizedStringDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  description?: LocalizedStringDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  address?: LocalizedStringDto | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  phones?: string[];

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  hours?: LocalizedStringDto | null;

  @IsOptional()
  @Matches(FILE_URL)
  @MaxLength(500)
  cover?: string | null;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}

export class CreateAlbumDto extends SlugAndCover {
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  title: LocalizedStringDto;

  @IsOptional()
  @IsInt()
  sort?: number;
}
export class UpdateAlbumDto extends PartialType(CreateAlbumDto) {}

export class CreatePhotoDto {
  @IsDefined()
  @IsUUID()
  albumId: string;

  @ApiProperty({ example: '/media/abc.webp' })
  @IsDefined()
  @Matches(FILE_URL)
  @MaxLength(500)
  file: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  caption?: LocalizedStringDto | null;

  @ApiPropertyOptional({ description: 'Автор и лицензия' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  credit?: string | null;

  @IsOptional()
  @IsInt()
  sort?: number;
}
export class UpdatePhotoDto extends PartialType(CreatePhotoDto) {}

/** PUT /admin/settings — частичное обновление; ключ не из списка → 400 unknown_field. */
export class UpdateSettingsDto {
  @ApiPropertyOptional({
    description: 'Стартовое смещение счётчика поддержавших',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  supporters_offset?: number;

  @ApiPropertyOptional({
    description: 'Тариф Кадиша за месяц, ₽; null — не задан',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  kaddish_month_rub?: number | null;

  @ApiPropertyOptional({
    description: 'Реквизиты для перевода (текст, ru/en/he)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  requisites?: LocalizedStringDto | null;

  @ApiPropertyOptional({
    description: 'Оператор ПДн: наименование, ИНН, адрес, email',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  operator?: LocalizedStringDto | null;

  @ApiPropertyOptional({ example: [{ name: 'VK', url: 'https://vk.com/…' }] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socials?: SocialLinkDto[];

  @ApiPropertyOptional({ example: ['+7 (4012) 00-00-00'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  header_phones?: string[];
}

export class SocialLinkDto {
  @IsDefined()
  @IsString()
  @MaxLength(50)
  name: string;

  @IsDefined()
  @Matches(/^https?:\/\/\S+$/, { message: 'url' })
  @MaxLength(300)
  url: string;
}

/** Query списков админки: `?page&limit` (`?lang` снимает общий pipe). */
export class AdminListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString({ no_symbols: true })
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString({ no_symbols: true })
  limit?: string;
}

/** `GET /admin/photos?albumId=<uuid>` — фото одного альбома. */
export class AdminPhotosQueryDto extends AdminListQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  albumId?: string;
}
