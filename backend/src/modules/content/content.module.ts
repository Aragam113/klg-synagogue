import { Module, NotFoundException, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AlbumEntity,
  DepartmentEntity,
  EventEntity,
  FundraiserEntity,
  NewsEntity,
  PhotoEntity,
  ProgramEntity,
  SiteSettingEntity,
} from './entities';
import { adminCrudController } from './admin-crud';
import {
  AdminSettingsController,
  ContentController,
} from './content.controller';
import { ContentService } from './content.service';
import { SettingsService } from './settings.service';
import { UploadsController } from './uploads/uploads.controller';
import { PaymentsModule } from '@modules/payments/payments.module';
import {
  CreateAlbumDto,
  CreateDepartmentDto,
  CreateEventDto,
  CreateFundraiserDto,
  CreateNewsDto,
  AdminPhotosQueryDto,
  CreatePhotoDto,
  CreateProgramDto,
  UpdateAlbumDto,
  UpdateDepartmentDto,
  UpdateEventDto,
  UpdateFundraiserDto,
  UpdateNewsDto,
  UpdatePhotoDto,
  UpdateProgramDto,
} from './dto/content.dto';

/** Админ-CRUD сущностей контента: /admin/news|events|fundraisers|programs|departments|albums|photos. */
const adminControllers = [
  adminCrudController<NewsEntity>(
    {
      path: 'news',
      entity: NewsEntity,
      order: { createdAt: 'DESC' },
      slug: true,
      notFound: 'Новость не найдена',
      // Первая публикация проставляет дату, если редактор её не задал.
      prepare: (data, _em, existing) => {
        const publishing = data.status === 'published';
        if (publishing && !data.publishedAt && !existing?.publishedAt) {
          data.publishedAt = new Date();
        }
      },
    },
    CreateNewsDto,
    UpdateNewsDto
  ),
  adminCrudController<EventEntity>(
    {
      path: 'events',
      entity: EventEntity,
      order: { startsAt: 'DESC' },
      slug: true,
      notFound: 'Событие не найдено',
    },
    CreateEventDto,
    UpdateEventDto
  ),
  adminCrudController<FundraiserEntity>(
    {
      path: 'fundraisers',
      entity: FundraiserEntity,
      order: { createdAt: 'DESC' },
      slug: true,
      notFound: 'Сбор не найден',
    },
    CreateFundraiserDto,
    UpdateFundraiserDto
  ),
  adminCrudController<ProgramEntity>(
    {
      path: 'programs',
      entity: ProgramEntity,
      order: { sort: 'ASC' },
      notFound: 'Программа не найдена',
    },
    CreateProgramDto,
    UpdateProgramDto
  ),
  adminCrudController<DepartmentEntity>(
    {
      path: 'departments',
      entity: DepartmentEntity,
      order: { sort: 'ASC' },
      notFound: 'Подразделение не найдено',
    },
    CreateDepartmentDto,
    UpdateDepartmentDto
  ),
  adminCrudController<AlbumEntity>(
    {
      path: 'albums',
      entity: AlbumEntity,
      order: { sort: 'ASC', createdAt: 'DESC' },
      slug: true,
      notFound: 'Альбом не найден',
    },
    CreateAlbumDto,
    UpdateAlbumDto
  ),
  adminCrudController<PhotoEntity>(
    {
      path: 'photos',
      entity: PhotoEntity,
      order: { sort: 'ASC' },
      notFound: 'Фото не найдено',
      listQuery: AdminPhotosQueryDto,
      filter: (q) => (q.albumId ? { albumId: q.albumId } : {}),
      prepare: async (data, em) => {
        if (typeof data.albumId !== 'string') return;
        const album = await em.findOneBy(AlbumEntity, { id: data.albumId });
        if (!album) throw new NotFoundException('Альбом не найден');
      },
    },
    CreatePhotoDto,
    UpdatePhotoDto
  ),
];

/**
 * Модуль «content»: новости, события, сборы, программы, подразделения, галерея,
 * настройки сайта, загрузка фото, поиск. Публичное — ContentController,
 * админское — /admin/* под AdminGuard.
 */
@Module({
  imports: [
    // Счётчик «Общину поддержали N раз» — PaymentsService.countPaidDonations().
    forwardRef(() => PaymentsModule),
    TypeOrmModule.forFeature([
      NewsEntity,
      EventEntity,
      FundraiserEntity,
      ProgramEntity,
      DepartmentEntity,
      AlbumEntity,
      PhotoEntity,
      SiteSettingEntity,
    ]),
  ],
  controllers: [
    ContentController,
    AdminSettingsController,
    UploadsController,
    ...adminControllers,
  ],
  providers: [ContentService, SettingsService],
  exports: [ContentService, SettingsService],
})
export class ContentModule {}
