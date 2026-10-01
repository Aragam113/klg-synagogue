import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { createIdempotent } from '@common/forms';
import { VALIDATION_MESSAGE } from '@common/pipes/field-validation.pipe';
import { CalendarService, addDays, kaliningradDate } from '@modules/calendar';
import { EventEntity } from '@modules/content/entities/event.entity';
import {
  EventRegistrationEntity,
  RequestEntity,
  RequestType,
  SubscriberEntity,
  YahrzeitReminderEntity,
} from './entities';
import {
  AppointmentRequestDto,
  EventRegistrationDto,
  ExcursionRequestDto,
  HelpRequestDto,
  PrayerRequestDto,
  RabbiQuestionDto,
  SubscribeDto,
  VolunteerRequestDto,
} from './dto/request-forms.dto';
import {
  AdminRequestsQueryDto,
  PatchRegistrationDto,
  PatchRequestDto,
} from './dto/admin-requests.dto';

/** Экскурсию можно заказать не раньше чем через столько дней. */
export const EXCURSION_MIN_DAYS_AHEAD = 3;

interface Contact {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface UpcomingYahrzeit {
  reminderId: string;
  requestId: string;
  deceasedName: string;
  fatherName: string | null;
  deathDate: string;
  /** Ближайшая годовщина по еврейскому календарю, YYYY-MM-DD. */
  anniversary: string;
  daysLeft: number;
  email: string | null;
  phone: string | null;
  byEmail: boolean;
  byPhone: boolean;
}

function fieldError(field: string, key: string): BadRequestException {
  return new BadRequestException({
    message: VALIDATION_MESSAGE,
    error: 'Validation Error',
    fields: { [field]: key },
  });
}

function withoutConsent<T extends { consent: boolean }>(dto: T) {
  const rest: Record<string, unknown> = { ...dto };
  delete rest.consent;
  return rest;
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000
  );
}

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly requests: Repository<RequestEntity>,
    @InjectRepository(EventRegistrationEntity)
    private readonly registrations: Repository<EventRegistrationEntity>,
    @InjectRepository(SubscriberEntity)
    private readonly subscribers: Repository<SubscriberEntity>,
    @InjectRepository(YahrzeitReminderEntity)
    private readonly reminders: Repository<YahrzeitReminderEntity>,
    private readonly db: DataSource,
    private readonly calendar: CalendarService
  ) {}

  // ---------- публичные формы ----------

  async createPrayer(dto: PrayerRequestDto, key: string | null) {
    const name = [dto.lastName, dto.firstName, dto.middleName]
      .filter(Boolean)
      .join(' ');
    const reminder =
      (dto.prayerType === 'kaddish' && dto.remind) ||
      (dto.prayerType === 'yahrzeit' &&
        (dto.remindByEmail || dto.remindByPhone));
    return this.create(
      'prayer',
      dto,
      { name, phone: dto.phone, email: dto.email },
      key,
      async (m, req) => {
        if (!reminder || !dto.deathDate) return;
        const byEmail =
          dto.prayerType === 'kaddish' ? true : !!dto.remindByEmail;
        await m.getRepository(YahrzeitReminderEntity).save({
          requestId: req.id,
          deceasedName: dto.deceasedName!,
          fatherName: dto.fatherName ?? null,
          deathDate: dto.deathDate,
          email: dto.email,
          phone: dto.phone ?? null,
          byEmail,
          byPhone: dto.prayerType === 'yahrzeit' && !!dto.remindByPhone,
        });
      }
    );
  }

  async createExcursion(dto: ExcursionRequestDto, key: string | null) {
    const earliest = addDays(kaliningradDate(), EXCURSION_MIN_DAYS_AHEAD);
    if (dto.date < earliest) throw fieldError('date', 'date_too_soon');
    if (this.calendar.isClosedForVisits(dto.date)) {
      throw fieldError('date', 'date_closed');
    }
    return this.create('excursion', dto, dto, key);
  }

  createAppointment(dto: AppointmentRequestDto, key: string | null) {
    return this.create('appointment', dto, dto, key);
  }

  createRabbiQuestion(dto: RabbiQuestionDto, key: string | null) {
    return this.create('rabbi_question', dto, dto, key);
  }

  createHelp(dto: HelpRequestDto, key: string | null) {
    return this.create('help', dto, { ...dto, name: dto.fullName }, key);
  }

  createVolunteer(dto: VolunteerRequestDto, key: string | null) {
    return this.create('volunteer', dto, dto, key);
  }

  private async create(
    type: RequestType,
    dto: { consent: boolean },
    contact: Contact,
    key: string | null,
    after?: (
      m: import('typeorm').EntityManager,
      req: RequestEntity
    ) => Promise<void>
  ): Promise<{ id: string }> {
    const { entity } = await createIdempotent(this.requests, key, () =>
      this.db.transaction(async (m) => {
        const req = await m.getRepository(RequestEntity).save(
          m.getRepository(RequestEntity).create({
            type,
            payload: withoutConsent(dto),
            contactName: contact.name,
            contactPhone: contact.phone ?? null,
            contactEmail: contact.email ?? null,
            idempotencyKey: key,
          })
        );
        if (after) await after(m, req);
        return req;
      })
    );
    return { id: entity.id };
  }

  /** Регистрация на опубликованное будущее событие; лимит мест — под блокировкой события. */
  async register(slug: string, dto: EventRegistrationDto, key: string | null) {
    const { entity } = await createIdempotent(this.registrations, key, () =>
      this.db.transaction(async (m) => {
        const event = await m.getRepository(EventEntity).findOne({
          where: { slug, status: 'published', startsAt: MoreThan(new Date()) },
          lock: { mode: 'pessimistic_write' },
        });
        if (!event) throw new NotFoundException('Событие не найдено');
        if (event.capacity !== null) {
          const row = await m
            .getRepository(EventRegistrationEntity)
            .createQueryBuilder('r')
            .select('COALESCE(SUM(r.seats), 0)::int', 'taken')
            .where('r.event_id = :id AND r.status <> :canceled', {
              id: event.id,
              canceled: 'canceled',
            })
            .getRawOne<{ taken: number }>();
          const left = Math.max(0, event.capacity - (row?.taken ?? 0));
          if (dto.seats > left) {
            throw new ConflictException({
              message: left === 0 ? 'sold_out' : 'not_enough_seats',
              error: 'Conflict',
              fields: { seats: `seats_left:${left}` },
            });
          }
        }
        const repo = m.getRepository(EventRegistrationEntity);
        return repo.save(
          repo.create({
            eventId: event.id,
            name: dto.name,
            phone: dto.phone,
            email: dto.email ?? null,
            seats: dto.seats,
            status: 'new',
            paymentId: null,
            idempotencyKey: key,
          })
        );
      })
    );
    const event = await this.db
      .getRepository(EventEntity)
      .findOneByOrFail({ id: entity.eventId });
    return {
      id: entity.id,
      eventId: event.id,
      isPaid: event.isPaid,
      seats: entity.seats,
    };
  }

  /** Повторная подписка того же email отдаёт тот же ответ. */
  async subscribe(dto: SubscribeDto): Promise<{ id: string }> {
    const email = dto.email.toLowerCase();
    await this.subscribers
      .createQueryBuilder()
      .insert()
      .values({ name: dto.name, email, livesInCity: !!dto.livesInCity })
      .orIgnore()
      .execute();
    const row = await this.subscribers.findOneByOrFail({ email });
    return { id: row.id };
  }

  // ---------- админка ----------

  async list(q: AdminRequestsQueryDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const [items, total] = await this.requests.findAndCount({
      where: {
        ...(q.type ? { type: q.type } : {}),
        ...(q.status ? { status: q.status } : {}),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async get(id: string) {
    const req = await this.requests.findOneBy({ id });
    if (!req) throw new NotFoundException('Заявка не найдена');
    const reminder = await this.reminders.findOneBy({ requestId: id });
    return { ...req, reminder };
  }

  async patch(id: string, dto: PatchRequestDto) {
    const req = await this.requests.findOneBy({ id });
    if (!req) throw new NotFoundException('Заявка не найдена');
    if (dto.status !== undefined) req.status = dto.status;
    if (dto.adminNote !== undefined) req.adminNote = dto.adminNote;
    return this.requests.save(req);
  }

  listSubscribers() {
    return this.subscribers.find({ order: { createdAt: 'DESC' } });
  }

  async eventRegistrations(eventId: string) {
    const event = await this.db
      .getRepository(EventEntity)
      .findOneBy({ id: eventId });
    if (!event) throw new NotFoundException('Событие не найдено');
    return this.registrations.find({
      where: { eventId },
      order: { createdAt: 'ASC' },
    });
  }

  async patchRegistration(id: string, dto: PatchRegistrationDto) {
    const reg = await this.registrations.findOneBy({ id });
    if (!reg) throw new NotFoundException('Регистрация не найдена');
    reg.status = dto.status;
    return this.registrations.save(reg);
  }

  /** Годовщины (еврейский календарь) в ближайшие `days` дней, по возрастанию даты. */
  async upcomingYahrzeits(
    days = 30,
    now = new Date()
  ): Promise<UpcomingYahrzeit[]> {
    const today = kaliningradDate(now);
    const until = addDays(today, days);
    const year = Number(today.slice(0, 4));
    const rows = await this.reminders.find();
    const result: UpcomingYahrzeit[] = [];
    for (const r of rows) {
      const next = [year, year + 1]
        .map((y) => this.calendar.hebrewAnniversary(r.deathDate, y))
        .find((d): d is string => !!d && d >= today && d > r.deathDate);
      if (!next || next > until) continue;
      result.push({
        reminderId: r.id,
        requestId: r.requestId,
        deceasedName: r.deceasedName,
        fatherName: r.fatherName,
        deathDate: r.deathDate,
        anniversary: next,
        daysLeft: daysBetween(today, next),
        email: r.email,
        phone: r.phone,
        byEmail: r.byEmail,
        byPhone: r.byPhone,
      });
    }
    return result.sort((a, b) => a.anniversary.localeCompare(b.anniversary));
  }
}
