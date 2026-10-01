import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LangCode, LocalizedString, localize } from '@common/localization';
import { SiteSettingEntity } from './entities';
import { UpdateSettingsDto } from './dto/content.dto';
import { PaymentsService } from '@modules/payments/payments.service';

export interface SiteSettings {
  supporters_offset: number;
  kaddish_month_rub: number | null;
  requisites: LocalizedString | null;
  operator: LocalizedString | null;
  socials: { name: string; url: string }[];
  header_phones: string[];
}

export const SETTINGS_DEFAULTS: SiteSettings = {
  supporters_offset: 0,
  kaddish_month_rub: null,
  requisites: null,
  operator: null,
  socials: [],
  header_phones: [],
};

const KEYS = Object.keys(SETTINGS_DEFAULTS) as (keyof SiteSettings)[];

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SiteSettingEntity)
    private readonly repo: Repository<SiteSettingEntity>,
    @Inject(forwardRef(() => PaymentsService))
    private readonly payments: PaymentsService
  ) {}

  /** Все настройки; незаданные — значения по умолчанию. */
  async getAll(): Promise<SiteSettings> {
    const rows = await this.repo.find();
    const out = { ...SETTINGS_DEFAULTS } as Record<string, unknown>;
    for (const r of rows)
      if (KEYS.includes(r.key as keyof SiteSettings)) out[r.key] = r.value;
    return out as unknown as SiteSettings;
  }

  /** Значение — сохраняет ключ; `null` — удаляет его (вернётся значение по умолчанию). */
  async update(dto: UpdateSettingsDto): Promise<SiteSettings> {
    const entries = Object.entries(dto).filter(
      ([key, value]) =>
        KEYS.includes(key as keyof SiteSettings) && value !== undefined
    );
    const cleared = entries.filter(([, v]) => v === null).map(([k]) => k);
    const rows = entries
      .filter(([, v]) => v !== null)
      .map(([key, value]) => ({ key, value: value as unknown }));
    if (cleared.length) await this.repo.delete({ key: In(cleared) });
    if (rows.length) await this.repo.save(rows.map((r) => this.repo.create(r)));
    return this.getAll();
  }

  /** «Общину поддержали N раз»: оплаченные пожертвования + смещение из админки. */
  async supportersCount(offset: number): Promise<number> {
    return (await this.payments.countPaidDonations()) + offset;
  }

  /** GET /settings/public — только то, что можно показывать посетителю. */
  async getPublic(lang: LangCode) {
    const s = await this.getAll();
    const requisites = s.requisites ? localize(s.requisites, lang) : null;
    const operator = s.operator ? localize(s.operator, lang) : null;
    return {
      supportersCount: await this.supportersCount(s.supporters_offset),
      kaddishMonthRub: s.kaddish_month_rub,
      requisites: requisites?.value ?? null,
      operator: operator?.value ?? null,
      socials: s.socials,
      headerPhones: s.header_phones,
      fallback: Boolean(requisites?.fallback || operator?.fallback),
    };
  }
}
