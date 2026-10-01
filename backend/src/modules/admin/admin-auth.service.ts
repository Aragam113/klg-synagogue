import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import adminConfig from '@config/admin.config';
import { hashAdminPassword } from './password-hash';
import { AdminLoginDto, AdminLoginResponseDto } from './dto/admin-login.dto';

export const ADMIN_ROLE = 'admin';
export const INVALID_CREDENTIALS = 'Неверный email или пароль';
// Хеш-пустышка той же стоимости, что у настоящих: для неизвестного email bcrypt всё равно
// выполняется, и время ответа не выдаёт, есть ли такой email.
const DUMMY_HASH = hashAdminPassword(randomBytes(16).toString('hex'));

@Injectable()
export class AdminAuthService {
  constructor(
    @Inject(adminConfig.KEY)
    private readonly admin: ConfigType<typeof adminConfig>,
    private readonly jwt: JwtService
  ) {}

  async login(dto: AdminLoginDto): Promise<AdminLoginResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const user = this.admin.users.find((u) => u.email === email);
    const ok = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH
    );
    if (!user || !ok) throw new UnauthorizedException(INVALID_CREDENTIALS);
    const token = await this.jwt.signAsync({
      sub: user.email,
      role: ADMIN_ROLE,
    });
    return { token };
  }
}
