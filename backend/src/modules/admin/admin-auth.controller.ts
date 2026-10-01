import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators';
import { AdminAuthService } from './admin-auth.service';
import { AdminOnly, AdminPrincipal } from './admin.guard';
import { AdminLoginDto, AdminLoginResponseDto } from './dto/admin-login.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Вход редактора (учётки из ADMIN_USERS)' })
  @ApiResponse({ status: 200, type: AdminLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Неверный email или пароль' })
  login(@Body() dto: AdminLoginDto): Promise<AdminLoginResponseDto> {
    return this.auth.login(dto);
  }

  @Get('ping')
  @AdminOnly()
  @ApiOperation({ summary: 'Проверка токена: 200 с email редактора' })
  ping(@CurrentUser() user: AdminPrincipal): { email: string } {
    return { email: user.sub };
  }
}
