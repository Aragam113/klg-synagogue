import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Lang } from '@common/decorators';
import type { LangCode } from '@common/localization';
import { AdminOnly } from '@modules/admin';
import { ContentService, parsePaging } from './content.service';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/content.dto';

/** Публичное чтение контента. Все ответы — строки на `?lang=` + `fallback`. */
@ApiTags('Content')
@Controller()
export class ContentController {
  constructor(
    private readonly content: ContentService,
    private readonly settings: SettingsService
  ) {}

  @Get('news')
  @ApiOperation({
    summary:
      'Лента новостей и анонсов (?page&limit, по 9; ?kind=news|announcement)',
  })
  listNews(
    @Lang() lang: LangCode,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('kind') kind?: string
  ) {
    return this.content.listNews(lang, parsePaging(page, limit, 9, 50), kind);
  }

  @Get('news/:slug')
  getNews(@Param('slug') slug: string, @Lang() lang: LangCode) {
    return this.content.getNews(slug, lang);
  }

  @Get('events')
  @ApiOperation({
    summary: 'Афиша: будущие по возрастанию; ?past=1 — прошедшие',
  })
  listEvents(
    @Lang() lang: LangCode,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('past') past?: string
  ) {
    return this.content.listEvents(
      lang,
      parsePaging(page, limit, 12, 50),
      past === '1' || past === 'true'
    );
  }

  @Get('events/:slug')
  getEvent(@Param('slug') slug: string, @Lang() lang: LangCode) {
    return this.content.getEvent(slug, lang);
  }

  @Get('fundraisers')
  @ApiOperation({ summary: 'Активные сборы' })
  listFundraisers(@Lang() lang: LangCode) {
    return this.content.listFundraisers(lang);
  }

  @Get('fundraisers/:slug')
  getFundraiser(@Param('slug') slug: string, @Lang() lang: LangCode) {
    return this.content.getFundraiser(slug, lang);
  }

  @Get('programs')
  listPrograms(@Lang() lang: LangCode) {
    return this.content.listPrograms(lang);
  }

  @Get('departments')
  listDepartments(@Lang() lang: LangCode) {
    return this.content.listDepartments(lang);
  }

  @Get('albums')
  listAlbums(@Lang() lang: LangCode) {
    return this.content.listAlbums(lang);
  }

  @Get('albums/:slug')
  getAlbum(@Param('slug') slug: string, @Lang() lang: LangCode) {
    return this.content.getAlbum(slug, lang);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Поиск по опубликованному (q ≥ 2 символов, до 20 результатов)',
  })
  search(@Query('q') q: string | undefined, @Lang() lang: LangCode) {
    return this.content.search(q, lang);
  }

  @Get('settings/public')
  publicSettings(@Lang() lang: LangCode) {
    return this.settings.getPublic(lang);
  }
}

@ApiTags('Admin: content')
@AdminOnly()
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.getAll();
  }

  @Put()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }
}
