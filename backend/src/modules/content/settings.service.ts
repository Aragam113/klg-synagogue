import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LangCode, LocalizedString, localize } from '@common/localization';
import { SiteSettingEntity } from './entities';
import { UpdateSettingsDto } from './dto/content.dto';

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
    private readonly repo: Repository<SiteSettingEntity>
  ) {}

  /** Все настройки; незаданные — значения по умолчанию. */
  async getAll(): Promise<SiteSettings> {
    const rows = await this.repo.find();
    const out = { ...SETTINGS_DEFAULTS } as Record<string, unknown>;
    for (const r of rows)
      if (KEYS.includes(r.key as keyof SiteSettings)) out[r.key] = r.value;
    return out as unknown as SiteSettings;
  }

  async update(dto: UpdateSettingsDto): Promise<SiteSettings> {
    const rows = Object.entries(dto)
      .filter(
        ([key, value]) =>
          KEYS.includes(key as keyof SiteSettings) && value !== undefined
      )
      .map(([key, value]) => ({ key, value: value as unknown }));
    if (rows.length) await this.repo.save(rows.map((r) => this.repo.create(r)));
    return this.getAll();
  }

  /** «Общину поддержали N раз»: оплаченные пожертвования + смещение из админки. */
  async supportersCount(offset: number): Promise<number> {
    const [{ n }]: { n: string }[] = await this.repo.query(
      `SELECT count(*) AS n FROM payments WHERE purpose = 'donation' AND status = 'paid'`
    );
    return Number(n) + offset;
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
