import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'editor@example.com' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: '••••••••' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password: string;
}

export class AdminLoginResponseDto {
  @ApiProperty()
  token: string;
}
