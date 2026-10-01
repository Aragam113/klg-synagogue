import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';
import { QueryFailedError, Repository } from 'typeorm';

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
const MAX_KEY_LENGTH = 100;

/** Значение заголовка `Idempotency-Key` (обрезанное) или null; длиннее 100 символов → 400. */
export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const raw = ctx
      .switchToHttp()
      .getRequest<Request>()
      .header(IDEMPOTENCY_HEADER);
    const key = raw?.trim();
    if (!key) return null;
    if (key.length > MAX_KEY_LENGTH) {
      throw new BadRequestException('Некорректный ключ повтора запроса');
    }
    return key;
  }
);

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err as QueryFailedError & { code?: string }).code === '23505'
  );
}

/**
 * Создание без дублей по клиентскому ключу. Таблица должна иметь колонку
 * `idempotency_key` (unique, null) — свойство сущности `idempotencyKey`.
 * Есть запись с этим ключом → вернуть её (`created: false`); иначе `create()`, который
 * сам кладёт `idempotencyKey` в сохраняемую сущность. Гонку двух одинаковых запросов
 * разрешает уникальный индекс: проигравший получает запись победителя.
 */
export async function createIdempotent<
  T extends { idempotencyKey: string | null },
>(
  repo: Repository<T>,
  key: string | null,
  create: () => Promise<T>
): Promise<{ entity: T; created: boolean }> {
  if (!key) return { entity: await create(), created: true };
  const find = () => repo.findOne({ where: { idempotencyKey: key } as never });
  const existing = await find();
  if (existing) return { entity: existing, created: false };
  try {
    return { entity: await create(), created: true };
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const winner = await find();
    if (!winner) throw err;
    return { entity: winner, created: false };
  }
}
