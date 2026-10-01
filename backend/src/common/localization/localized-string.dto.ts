import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LocalizedString } from './localize';

/**
 * Тело локализуемого поля `{ru, en?, he?}`; ru обязателен.
 * Использование в DTO:
 *   @IsDefined() @ValidateNested() @Type(() => LocalizedStringDto) title: LocalizedStringDto;
 * Ошибки приходят как `fields: {'title.ru': 'required'}`.
 */
export class LocalizedStringDto implements LocalizedString {
  @ApiProperty({ example: 'Шаббат' })
  @IsString()
  @IsNotEmpty()
  ru: string;

  @ApiPropertyOptional({ example: 'Shabbat' })
  @IsOptional()
  @IsString()
  en?: string;

  @ApiPropertyOptional({ example: 'שבת' })
  @IsOptional()
  @IsString()
  he?: string;
}
