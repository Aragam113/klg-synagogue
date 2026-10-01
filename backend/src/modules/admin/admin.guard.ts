import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { ADMIN_ROLE } from './admin-auth.service';

export const NEED_LOGIN = 'Требуется вход в админку';

export interface AdminPrincipal {
  sub: string;
  role: string;
}

/** Пускает только `Authorization: Bearer <JWT редактора>`; кладёт payload в `req.user`. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AdminPrincipal }>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token)
      throw new UnauthorizedException(NEED_LOGIN);
    try {
      const payload = await this.jwt.verifyAsync<AdminPrincipal>(token);
      if (payload.role !== ADMIN_ROLE) throw new Error('role');
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException(NEED_LOGIN);
    }
  }
}

/** Для админ-контроллеров любых модулей: `@AdminOnly()` на класс или метод. */
export function AdminOnly(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(AdminGuard),
    ApiBearerAuth('JWT-auth'),
    ApiUnauthorizedResponse({ description: NEED_LOGIN })
  );
}
