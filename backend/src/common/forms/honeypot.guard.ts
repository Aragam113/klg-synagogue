import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { BAD_REQUEST_RU } from '../filters';

/** Скрытое поле формы: люди его не видят и не заполняют, боты — заполняют. */
export const HONEYPOT_FIELD = 'website';
export const HONEYPOT_REJECTED = BAD_REQUEST_RU;

/**
 * Непустой `website` → 400 без подробностей (без `fields`).
 * Пустой — убирается из тела, чтобы валидация DTO не считала его лишним полем.
 */
@Injectable()
export class HoneypotGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const body = context.switchToHttp().getRequest<Request>().body as
      | Record<string, unknown>
      | undefined;
    if (!body || typeof body !== 'object' || !(HONEYPOT_FIELD in body)) {
      return true;
    }
    const value = body[HONEYPOT_FIELD];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      throw new BadRequestException(HONEYPOT_REJECTED);
    }
    delete body[HONEYPOT_FIELD];
    return true;
  }
}
