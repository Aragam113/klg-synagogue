import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  LessThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { LangCode, isLang } from '@common/localization';
import {
  AlbumEntity,
  DepartmentEntity,
  EventEntity,
  FundraiserEntity,
  NewsEntity,
  ProgramEntity,
} from './entities';
import {
  albumCard,
  departmentItem,
  eventItem,
  fundraiserItem,
  newsCard,
  newsItem,
  newsNeighbour,
  photoItem,
  programItem,
} from './content.mappers';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/** `?page&limit` из строки запроса; мусор → значения по умолчанию. */
export function parsePaging(
  page: unknown,
  limit: unknown,
  defLimit: number,
  maxLimit = 100
): { page: number; limit: number } {
  const p = Number.parseInt(String(page ?? ''), 10);
  const l = Number.parseInt(String(limit ?? ''), 10);
  return {
    page: Number.isFinite(p) && p > 0 ? p : 1,
    limit: Number.isFinite(l) && l > 0 ? Math.min(l, maxLimit) : defLimit,
  };
}

export function toPage<T>(
  items: T[],
  total: number,
  paging: { page: number; limit: number }
): Page<T> {
  return {
    items,
    total,
    ...paging,
    hasMore: paging.page * paging.limit < total,
  };
}

export type SearchType =
  | 'news'
  | 'event'
  | 'fundraiser'
  | 'program'
  | 'department';

export interface SearchHit {
  type: SearchType;
  id: string;
  slug: string | null;
  title: string;
  snippet: string;
  url: string;
  fallback: boolean;
}

/** Публичное чтение контента: только опубликованное, строки на языке запроса. */
@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(NewsEntity) private readonly news: Repository<NewsEntity>,
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
    @InjectRepository(FundraiserEntity)
    private readonly fundraisers: Repository<FundraiserEntity>,
    @InjectRepository(ProgramEntity)
    private readonly programs: Repository<ProgramEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly departments: Repository<DepartmentEntity>,
    @InjectRepository(AlbumEntity)
    private readonly albums: Repository<AlbumEntity>
  ) {}

  async listNews(
    lang: LangCode,
    paging: { page: number; limit: number },
    kind?: string
  ) {
    const where: FindOptionsWhere<NewsEntity> = { status: 'published' };
    if (kind === 'news' || kind === 'announcement') where.kind = kind;
    const [rows, total] = await this.news.findAndCount({
      where,
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
      skip: (paging.page - 1) * paging.limit,
      take: paging.limit,
    });
    return toPage(
      rows.map((n) => newsCard(n, lang)),
      total,
      paging
    );
  }

  async getNews(slug: string, lang: LangCode) {
    const row = await this.news.findOneBy({ slug, status: 'published' });
    if (!row) throw new NotFoundException('Новость не найдена');
    const [prev, next] = await Promise.all([
      this.newsNeighbour(row, 'older'),
      this.newsNeighbour(row, 'newer'),
    ]);
    return {
      ...newsItem(row, lang),
      prev: prev ? newsNeighbour(prev, lang) : null,
      next: next ? newsNeighbour(next, lang) : null,
    };
  }

  /**
   * Сосед новости в ленте (порядок ленты: published_at DESC, created_at DESC; id — для полного порядка).
   * NULL published_at в ленте идёт первым (DESC) — считаем его +infinity.
   */
  private newsNeighbour(row: NewsEntity, side: 'older' | 'newer') {
    const cols = (a: string) =>
      `COALESCE(${a}.published_at, 'infinity'::timestamptz), ${a}.created_at, ${a}.id`;
    // ключ текущей строки берём из БД: в JS Date теряются микросекунды created_at
    const at = `(SELECT ${cols('c')} FROM news c WHERE c.id = :id)`;
    const dir = side === 'older' ? 'DESC' : 'ASC';
    return this.news
      .createQueryBuilder('n')
      .where("n.status = 'published'")
      .andWhere(`(${cols('n')}) ${side === 'older' ? '<' : '>'} ${at}`, {
        id: row.id,
      })
      .orderBy("COALESCE(n.published_at, 'infinity'::timestamptz)", dir)
      .addOrderBy('n.created_at', dir)
      .addOrderBy('n.id', dir)
      .getOne();
  }

  async listEvents(
    lang: LangCode,
    paging: { page: number; limit: number },
    past: boolean,
    now = new Date()
  ) {
    const [rows, total] = await this.events.findAndCount({
      where: {
        status: 'published',
        startsAt: past ? LessThan(now) : MoreThanOrEqual(now),
      },
      order: { startsAt: past ? 'DESC' : 'ASC' },
      skip: (paging.page - 1) * paging.limit,
      take: paging.limit,
    });
    return toPage(
      rows.map((e) => eventItem(e, lang, now)),
      total,
      paging
    );
  }

  async getEvent(slug: string, lang: LangCode) {
    const row = await this.events.findOneBy({ slug, status: 'published' });
    if (!row) throw new NotFoundException('Событие не найдено');
    return eventItem(row, lang, new Date());
  }

  async listFundraisers(lang: LangCode) {
    const rows = await this.fundraisers.find({
      where: { status: 'active' },
      order: { createdAt: 'DESC' },
    });
    return rows.map((f) => fundraiserItem(f, lang));
  }

  /** По слагу отдаётся и закрытый сбор (ссылки из соцсетей не должны ломаться). */
  async getFundraiser(slug: string, lang: LangCode) {
    const row = await this.fundraisers.findOneBy({ slug });
    if (!row) throw new NotFoundException('Сбор не найден');
    return fundraiserItem(row, lang);
  }

  async listPrograms(lang: LangCode) {
    const rows = await this.programs.find({
      where: { published: true },
      order: { sort: 'ASC' },
    });
    return rows.map((p) => programItem(p, lang));
  }

  async listDepartments(lang: LangCode) {
    const rows = await this.departments.find({
      where: { published: true },
      order: { sort: 'ASC' },
    });
    return rows.map((d) => departmentItem(d, lang));
  }

  async listAlbums(lang: LangCode) {
    const rows = await this.albums.find({
      relations: { photos: true },
      order: { sort: 'ASC', createdAt: 'DESC', photos: { sort: 'ASC' } },
    });
    return rows.map((a) => albumCard(a, lang, a.photos?.length ?? 0));
  }

  async getAlbum(slug: string, lang: LangCode) {
    const row = await this.albums.findOne({
      where: { slug },
      relations: { photos: true },
      order: { photos: { sort: 'ASC' } },
    });
    if (!row) throw new NotFoundException('Альбом не найден');
    const photos = (row.photos ?? []).map((p) => photoItem(p, lang));
    const card = albumCard(row, lang, photos.length);
    return {
      ...card,
      photos,
      fallback: card.fallback || photos.some((p) => p.fallback),
    };
  }

  /**
   * ILIKE по локализованным заголовкам (и лидам новостей) опубликованного:
   * сравнивается строка, которую увидит посетитель (перевод или ru-фолбэк).
   */
  async search(
    q: string | undefined,
    lang: LangCode
  ): Promise<{ q: string; items: SearchHit[] }> {
    const query = (q ?? '').trim();
    if (query.length < 2) {
      throw new BadRequestException({
        message: 'Запрос слишком короткий',
        error: 'Validation Error',
        fields: { q: 'too_short' },
      });
    }
    const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    // Язык — параметр $2 (никогда не текст запроса); закрытый набор проверяется ещё раз.
    const l: LangCode = isLang(lang) ? lang : 'ru';
    const loc = (col: string) =>
      `COALESCE(NULLIF(${col}->>$2::text, ''), ${col}->>'ru', '')`;
    const fb = `COALESCE(title->>$2::text, '') = ''`;
    const sql = `
      SELECT * FROM (
        SELECT 'news' AS type, id, slug, ${loc('title')} AS title, ${loc('lead')} AS snippet,
               ${fb} AS fb, 1 AS ord, published_at AS at
          FROM news WHERE status = 'published'
        UNION ALL
        SELECT 'event', id, slug, ${loc('title')}, ${loc('place')},
               ${fb}, 2, starts_at
          FROM events WHERE status = 'published'
        UNION ALL
        SELECT 'fundraiser', id, slug, ${loc('title')}, '',
               ${fb}, 3, created_at
          FROM fundraisers WHERE status = 'active'
        UNION ALL
        SELECT 'program', id, NULL, ${loc('title')}, ${loc('audience')},
               ${fb}, 4, NULL
          FROM programs WHERE published
        UNION ALL
        SELECT 'department', id, NULL, ${loc('title')}, ${loc('address')},
               ${fb}, 5, NULL
          FROM departments WHERE published
      ) s
      WHERE s.title ILIKE $1 OR (s.type = 'news' AND s.snippet ILIKE $1)
      ORDER BY s.ord, s.at DESC NULLS LAST
      LIMIT 20`;
    const rows: {
      type: SearchType;
      id: string;
      slug: string | null;
      title: string;
      snippet: string;
      fb: boolean;
    }[] = await this.news.query(sql, [pattern, l]);
    const urls: Record<SearchType, (slug: string | null) => string> = {
      news: (s) => `/news/${s}`,
      event: (s) => `/events/${s}`,
      fundraiser: (s) => `/fundraisers/${s}`,
      program: () => '/programs',
      department: () => '/departments',
    };
    return {
      q: query,
      items: rows.map((r) => ({
        type: r.type,
        id: r.id,
        slug: r.slug,
        title: r.title,
        snippet: r.snippet ?? '',
        url: urls[r.type](r.slug),
        fallback: l !== 'ru' && r.fb,
      })),
    };
  }
}
