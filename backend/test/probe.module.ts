import { Body, Controller, Module, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedStringDto, PublicForm } from '../src/common';

/** Тестовая публичная форма: проверяет общую инфраструктуру форм без модулей-владельцев. */
export class ProbeFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsBoolean()
  consent: boolean;

  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  title: LocalizedStringDto;
}

@Controller('probe')
class ProbeController {
  @Post('form')
  @PublicForm()
  submit(@Body() dto: ProbeFormDto) {
    return { name: dto.name };
  }

  @Post('other-form')
  @PublicForm()
  other() {
    return { ok: true };
  }

  @Post('not-a-form')
  plain() {
    return { ok: true };
  }
}

@Module({ controllers: [ProbeController] })
export class ProbeModule {}
