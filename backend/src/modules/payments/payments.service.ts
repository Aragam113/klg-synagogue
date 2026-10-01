import {
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, timingSafeEqual } from 'crypto';
import { DataSource, EntityManager, IsNull, Not, Repository } from 'typeorm';
import { createIdempotent } from '@common/forms';
import { LangCode, localize } from '@common/localization';
import { VALIDATION_MESSAGE } from '@common/pipes/field-validation.pipe';
import { currentPrice } from '@modules/content/price';
import { EventEntity } from '@modules/content/entities/event.entity';
import { FundraiserEntity } from '@modules/content/entities/fundraiser.entity';
import { SettingsService } from '@modules/content/settings.service';
import { RequestEntity } from '@modules/requests/entities/request.entity';
import { EventRegistrationEntity } from '@modules/requests/entities/event-registration.entity';
import {
  PaymentEntity,
  PaymentPurpose,
  PaymentStatus,
  RecurringDonationEntity,
} from './entities';
import { AdminPaymentsQueryDto, CreatePaymentDto } from './dto/payments.dto';
import { PAYMENT_PROVIDER, PaymentProvider } from './payment-provider';

/** Итог, о котором сообщает касса. */
export type NotificationStatus = Exclude<PaymentStatus, 'pending'>;

function fieldError(field: string, key: string): BadRequestException {
  return new BadRequestException({
    message: VALIDATION_MESSAGE,
    error: 'Validation Error',
    fields: { [field]: key },
  });
}

const token = () => randomBytes(24).toString('hex');

function sameToken(a: string, b: string | undefined): boolean {
  if (!b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const PURPOSE_TEXT: Record<PaymentPurpose, string> = {
  donation: 'Пожертвование общине',
  prayer: 'Пожертвование за молитву',
  event: 'Билет на событие',
};

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(RecurringDonationEntity)
    private readonly recurring: Repository<RecurringDonationEntity>,
    private readonly db: DataSource,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    // content ↔ payments: настройки нужны здесь, счётчик платежей — в настройках.
    @Inject(forwardRef(() => SettingsService))
    private readonly settings: SettingsService
  ) {}

  get mode() {
    return this.provider.mode;
  }

  // ---------- создание ----------

  /**
   * POST /payments → `{paymentId, confirmUrl, accessToken}`; повтор ключа — тот же платёж.
   * На одну регистрацию — один неоплаченный платёж: пока он `pending`, повтор отдаёт его же.
   */
  async create(dto: CreatePaymentDto, key: string | null) {
    const { entity } = await createIdempotent(this.payments, key, () =>
      this.db.transaction(async (m) => {
        const draft = await this.resolve(m, dto);
        if ('existing' in draft) return draft.existing;
        return m.getRepository(PaymentEntity).save(
          m.getRepository(PaymentEntity).create({
            ...draft,
            purpose: dto.purpose,
            recurring: dto.purpose === 'donation' && !!dto.recurring,
            anonymous: dto.anonymous,
            donorName: dto.anonymous ? null : (dto.donorName ?? null),
            email: dto.email,
            phone: dto.phone ?? null,
            comment: dto.comment ?? null,
            dedication: dto.dedication ?? null,
            dedicationVisible: false,
            status: 'pending',
            accessToken: token(),
            idempotencyKey: key,
          })
        );
      })
    );
    const { providerPaymentId, confirmUrl } = await this.provider.create({
      paymentId: entity.id,
      accessToken: entity.accessToken,
      amountRub: entity.amountRub,
      description: PURPOSE_TEXT[entity.purpose],
    });
    if (entity.providerPaymentId !== providerPaymentId) {
      await this.payments.update(entity.id, { providerPaymentId });
    }
    return {
      paymentId: entity.id,
      confirmUrl,
      accessToken: entity.accessToken,
    };
  }

  /** Сумма и связи платежа по назначению; клиентская сумма для билета игнорируется. */
  private async resolve(
    m: EntityManager,
    dto: CreatePaymentDto
  ): Promise<
    | {
        amountRub: number;
        fundraiserId: string | null;
        requestId: string | null;
        registrationId: string | null;
      }
    | { existing: PaymentEntity }
  > {
    const none = { fundraiserId: null, requestId: null, registrationId: null };
    if (dto.purpose === 'event') {
      // Блокировка строки регистрации: параллельные запросы встают в очередь
      // и видят уже созданный pending-платёж.
      const reg = await m.getRepository(EventRegistrationEntity).findOne({
        where: { id: dto.registrationId! },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reg) throw new NotFoundException('Регистрация не найдена');
      if (reg.status === 'canceled')
        throw fieldError('registrationId', 'canceled');
      if (reg.status === 'confirmed')
        throw new ConflictException({
          message: 'already_paid',
          error: 'Conflict',
        });
      const pending = await m.getRepository(PaymentEntity).findOneBy({
        registrationId: reg.id,
        status: 'pending',
      });
      if (pending) return { existing: pending };
      const event = await m
        .getRepository(EventEntity)
        .findOneByOrFail({ id: reg.eventId });
      const price = currentPrice(event, new Date());
      if (price === null) throw fieldError('registrationId', 'not_paid');
      return { ...none, amountRub: price * reg.seats, registrationId: reg.id };
    }

    if (dto.purpose === 'prayer') {
      const req = await m
        .getRepository(RequestEntity)
        .findOneBy({ id: dto.requestId!, type: 'prayer' });
      if (!req) throw new NotFoundException('Заявка не найдена');
      const months = Number(req.payload.months);
      const tariff = await this.kaddishTariff();
      if (req.payload.prayerType === 'kaddish' && tariff && months > 0) {
        return { ...none, amountRub: months * tariff, requestId: req.id };
      }
      if (!dto.amountRub) throw fieldError('amountRub', 'required');
      return { ...none, amountRub: dto.amountRub, requestId: req.id };
    }

    if (!dto.amountRub) throw fieldError('amountRub', 'required');
    let fundraiserId: string | null = null;
    if (dto.fundraiserSlug) {
      const f = await m
        .getRepository(FundraiserEntity)
        .findOneBy({ slug: dto.fundraiserSlug, status: 'active' });
      if (!f) throw fieldError('fundraiserSlug', 'invalid_choice');
      fundraiserId = f.id;
    }
    return { ...none, amountRub: dto.amountRub, fundraiserId };
  }

  /** Тариф Кадиша за месяц из настроек сайта (`kaddish_month_rub`), null — не задан. */
  private async kaddishTariff(): Promise<number | null> {
    const n = Number((await this.settings.getAll()).kaddish_month_rub);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  // ---------- статус ----------

  private async byToken(id: string, accessToken: string | undefined) {
    const p = await this.payments.findOne({
      where: { id },
      relations: { fundraiser: true },
    });
    if (!p || !sameToken(p.accessToken, accessToken))
      throw new NotFoundException('Платёж не найден');
    return p;
  }

  /** GET /payments/:id?token — для экрана «Спасибо» и тестовой кассы. */
  async status(id: string, accessToken: string | undefined, lang: LangCode) {
    const p = await this.byToken(id, accessToken);
    const sub = p.recurring
      ? await this.recurring.findOneBy({ paymentId: p.id })
      : null;
    let event: { slug: string; title: string } | null = null;
    if (p.registrationId) {
      const reg = await this.db.getRepository(EventRegistrationEntity).findOne({
        where: { id: p.registrationId },
        relations: { event: true },
      });
      if (reg?.event)
        event = {
          slug: reg.event.slug,
          title: localize(reg.event.title, lang).value,
        };
    }
    return {
      id: p.id,
      status: p.status,
      purpose: p.purpose,
      amountRub: p.amountRub,
      recurring: p.recurring,
      anonymous: p.anonymous,
      donorName: p.donorName,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
      fundraiser: p.fundraiser
        ? {
            slug: p.fundraiser.slug,
            title: localize(p.fundraiser.title, lang).value,
          }
        : null,
      event,
      subscription: sub
        ? { id: sub.id, status: sub.status, cancelToken: sub.cancelToken }
        : null,
    };
  }

  // ---------- уведомления кассы ----------

  /** Тестовая касса: кнопки «Оплатить / Отменить» → общий обработчик уведомлений. */
  async fakeAction(
    id: string,
    accessToken: string | undefined,
    action: 'pay' | 'cancel'
  ) {
    if (this.provider.mode !== 'fake')
      throw new NotFoundException('Тестовая касса выключена');
    const p = await this.byToken(id, accessToken);
    if (!p.providerPaymentId) throw new NotFoundException('Платёж не найден');
    await this.applyNotification(
      p.providerPaymentId,
      action === 'pay' ? 'paid' : 'canceled'
    );
    const fresh = await this.payments.findOneByOrFail({ id });
    return { id, status: fresh.status };
  }

  /**
   * Единственный путь смены статуса платежа. Идемпотентен: `paid` проводится один раз
   * (UPDATE … WHERE status IN ('pending','failed')), отменённый не оплачивается, отмена/ошибка — только из `pending`.
   * При `paid`: сбор +сумма и +1 поддержавший, регистрация подтверждена,
   * ежемесячное — подписка `active` с токеном отмены. → изменилось ли что-то.
   */
  async applyNotification(
    providerPaymentId: string,
    status: NotificationStatus
  ): Promise<boolean> {
    return this.db.transaction(async (m) => {
      const qb = m
        .createQueryBuilder()
        .update(PaymentEntity)
        .set(status === 'paid' ? { status, paidAt: () => 'now()' } : { status })
        .where('provider_payment_id = :providerPaymentId', {
          providerPaymentId,
        });
      if (status === 'paid') qb.andWhere(`status IN ('pending', 'failed')`);
      else qb.andWhere(`status = 'pending'`);
      const res = await qb.returning('id').execute();
      const rows = res.raw as { id: string }[];
      if (!rows.length) return false;
      if (status === 'paid') await this.onPaid(m, rows[0].id);
      return true;
    });
  }

  private async onPaid(m: EntityManager, paymentId: string) {
    const p = await m.getRepository(PaymentEntity).findOneByOrFail({
      id: paymentId,
    });
    if (p.fundraiserId) {
      await m
        .createQueryBuilder()
        .update(FundraiserEntity)
        .set({
          raisedRub: () => `raised_rub + ${Number(p.amountRub)}`,
          supporters: () => 'supporters + 1',
        })
        .where('id = :id', { id: p.fundraiserId })
        .execute();
    }
    if (p.registrationId) {
      await m
        .getRepository(EventRegistrationEntity)
        .update(
          { id: p.registrationId, status: 'new' },
          { status: 'confirmed', paymentId: p.id }
        );
    }
    if (p.recurring && p.email) {
      await m.getRepository(RecurringDonationEntity).save({
        paymentId: p.id,
        amountRub: p.amountRub,
        email: p.email,
        status: 'active',
        cancelToken: token(),
      });
    }
  }

  // ---------- подписки, лента, счётчик ----------

  /** POST /recurring/:id/cancel?token; чужой токен → 404. */
  async cancelRecurring(id: string, cancelToken: string | undefined) {
    const sub = await this.recurring.findOneBy({ id });
    if (!sub || !sameToken(sub.cancelToken, cancelToken))
      throw new NotFoundException('Подписка не найдена');
    if (sub.status !== 'canceled')
      await this.recurring.update(sub.id, { status: 'canceled' });
    return { id: sub.id, status: 'canceled' as const };
  }

  /** GET /dedications — одобренные посвящения оплаченных платежей, новые сверху. */
  async dedications(limit = 20) {
    const rows = await this.payments.find({
      where: {
        status: 'paid',
        dedicationVisible: true,
        dedication: Not(IsNull()),
      },
      order: { paidAt: 'DESC' },
      take: limit,
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.anonymous ? null : p.donorName,
      anonymous: p.anonymous || !p.donorName,
      text: p.dedication!,
      date: p.paidAt,
    }));
  }

  /** Сколько раз общину поддержали: оплаченные пожертвования (без молитв и билетов). */
  countPaidDonations(): Promise<number> {
    return this.payments.count({
      where: { purpose: 'donation', status: 'paid' },
    });
  }

  // ---------- админка ----------

  async adminList(q: AdminPaymentsQueryDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const [rows, total] = await this.payments.findAndCount({
      where: {
        ...(q.purpose ? { purpose: q.purpose } : {}),
        ...(q.status ? { status: q.status } : {}),
      },
      relations: { fundraiser: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const items = rows.map(({ accessToken: _t, fundraiser, ...p }) => ({
      ...p,
      fundraiser: fundraiser
        ? {
            id: fundraiser.id,
            slug: fundraiser.slug,
            title: fundraiser.title.ru,
          }
        : null,
    }));
    return { items, total, page, limit };
  }

  async adminRecurring() {
    const rows = await this.recurring.find({ order: { createdAt: 'DESC' } });
    return rows.map(({ cancelToken: _t, ...r }) => r);
  }

  async setDedicationVisible(id: string, visible: boolean) {
    const p = await this.payments.findOneBy({ id });
    if (!p) throw new NotFoundException('Платёж не найден');
    await this.payments.update(id, { dedicationVisible: visible });
    return { id, dedicationVisible: visible };
  }
}
