import { Global, Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import jwtConfig from '@config/jwt.config';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminGuard } from './admin.guard';

/**
 * Вход в админку. Глобальный: `AdminGuard`/`@AdminOnly()` работают в контроллерах
 * любого модуля без импорта AdminModule.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [jwtConfig.KEY],
      useFactory: (jwt: ConfigType<typeof jwtConfig>) => {
        if (!jwt.secret) {
          throw new Error('JWT_SECRET не задан: заполните backend/.env');
        }
        return {
          secret: jwt.secret,
          signOptions: { expiresIn: jwt.expiresIn as StringValue },
        };
      },
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminGuard],
  exports: [AdminGuard, JwtModule],
})
export class AdminModule {}
