import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Type,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  DataSource,
  EntityManager,
  EntityTarget,
  FindOptionsOrder,
  FindOptionsWhere,
  ObjectLiteral,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { FieldValidationPipe } from '@common/pipes';
import { AdminOnly } from '@modules/admin';
import { parsePaging, toPage } from './content.service';
import { slugify, uniqueSlug } from './slug';
import { AdminListQueryDto } from './dto/content.dto';

const SLUG_RETRIES = 5;

/** Отказ уникального индекса по колонке slug (Postgres 23505). */
function isSlugConflict(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const d = err.driverError as { code?: string; detail?: string } | undefined;
  return d?.code === '23505' && /\(slug\)/.test(d.detail ?? '');
}

/** Глобальный pipe не видит тип тела/query в контроллере-фабрике — передаём его явно. */
class TypedPipe extends FieldValidationPipe {
  constructor(type: Type<unknown>) {
    super();
    this.expectedType = type;
  }
}

export interface CrudSpec<E extends ObjectLiteral> {
  path: string;
  entity: EntityTarget<E>;
  order: FindOptionsOrder<E>;
  /** У сущности есть слаг: генерируется из title.ru, уникален. */
  slug?: boolean;
  /** DTO query списка (по умолчанию `AdminListQueryDto`: page, limit); проверяется глобальными правилами полей. */
  listQuery?: Type<unknown>;
  /** Фильтр списка по уже проверенному query (например `?albumId=`). */
  filter?: (query: Record<string, string | undefined>) => FindOptionsWhere<E>;
  /** Подготовка данных перед сохранением (проверки, производные поля). */
  prepare?: (
    data: Record<string, unknown>,
    em: EntityManager,
    existing?: E
  ) => Promise<void> | void;
  notFound: string;
}

/** CRUD одной сущности для админки: список с пагинацией, карточка, создание, правка, удаление. */
export class CrudService<E extends ObjectLiteral & { id: string }> {
  constructor(
    private readonly repo: Repository<E>,
    private readonly spec: CrudSpec<E>
  ) {}

  async list(query: Record<string, string | undefined>) {
    const paging = parsePaging(query.page, query.limit, 50);
    const [items, total] = await this.repo.findAndCount({
      where: this.spec.filter?.(query),
      order: this.spec.order,
      skip: (paging.page - 1) * paging.limit,
      take: paging.limit,
    });
    return toPage(items, total, paging);
  }

  async get(id: string): Promise<E> {
    const row = await this.repo.findOneBy({ id } as FindOptionsWhere<E>);
    if (!row) throw new NotFoundException(this.spec.notFound);
    return row;
  }

  async create(dto: object): Promise<E> {
    const data = { ...dto } as Record<string, unknown>;
    await this.spec.prepare?.(data, this.repo.manager);
    if (!this.spec.slug) return this.repo.save(this.repo.create(data as E));
    const base =
      (data.slug as string | undefined) ??
      slugify((data.title as { ru: string }).ru);
    return this.withFreeSlug(base, undefined, async (slug) =>
      this.repo.save(this.repo.create({ ...data, slug } as unknown as E))
    );
  }

  async update(id: string, dto: object): Promise<E> {
    const existing = await this.get(id);
    const data = { ...dto } as Record<string, unknown>;
    await this.spec.prepare?.(data, this.repo.manager, existing);
    if (
      this.spec.slug &&
      typeof data.slug === 'string' &&
      data.slug !== existing.slug
    ) {
      return this.withFreeSlug(data.slug, id, async (slug) => {
        this.repo.merge(existing, { ...data, slug } as unknown as E);
        return this.repo.save(existing);
      });
    }
    this.repo.merge(existing, data as E);
    return this.repo.save(existing);
  }

  async remove(id: string): Promise<{ id: string }> {
    const row = await this.get(id);
    await this.repo.remove(row);
    return { id };
  }

  /**
   * Гонка freeSlug → save: если параллельный запрос успел занять слаг, уникальный индекс
   * отказывает — берём следующий свободный и пробуем снова; после SLUG_RETRIES попыток — 409.
   */
  private async withFreeSlug(
    base: string,
    selfId: string | undefined,
    save: (slug: string) => Promise<E>
  ): Promise<E> {
    for (let attempt = 0; attempt < SLUG_RETRIES; attempt++) {
      const slug = await this.freeSlug(base, selfId);
      try {
        return await save(slug);
      } catch (err) {
        if (!isSlugConflict(err)) throw err;
      }
    }
    throw new ConflictException({
      message: 'Адрес (slug) уже занят, повторите сохранение',
      fields: { slug: 'taken' },
    });
  }

  private freeSlug(base: string, selfId?: string): Promise<string> {
    return uniqueSlug(base, async (slug) => {
      const row = await this.repo.findOneBy({
        slug,
      } as unknown as FindOptionsWhere<E>);
      return !!row && row.id !== selfId;
    });
  }
}

/** Контроллер `/admin/<path>` под AdminGuard для сущности из spec. */
export function adminCrudController<E extends ObjectLiteral & { id: string }>(
  spec: CrudSpec<E>,
  createDto: Type<unknown>,
  updateDto: Type<unknown>
): Type<unknown> {
  @ApiTags('Admin: content')
  @AdminOnly()
  @Controller(`admin/${spec.path}`)
  class AdminCrudController {
    readonly crud: CrudService<E>;

    constructor(ds: DataSource) {
      this.crud = new CrudService(ds.getRepository(spec.entity), spec);
    }

    @Get()
    list(
      @Query(new TypedPipe(spec.listQuery ?? AdminListQueryDto))
      query: Record<string, string | undefined>
    ) {
      return this.crud.list(query);
    }

    @Get(':id')
    get(@Param('id', ParseUUIDPipe) id: string) {
      return this.crud.get(id);
    }

    @Post()
    create(@Body(new TypedPipe(createDto)) dto: object) {
      return this.crud.create(dto);
    }

    @Patch(':id')
    update(
      @Param('id', ParseUUIDPipe) id: string,
      @Body(new TypedPipe(updateDto)) dto: object
    ) {
      return this.crud.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
      return this.crud.remove(id);
    }
  }
  Object.defineProperty(AdminCrudController, 'name', {
    value: `Admin_${spec.path}_Controller`,
  });
  return AdminCrudController;
}
