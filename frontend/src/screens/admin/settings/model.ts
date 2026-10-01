import { fromLoc, type Loc, toLoc } from '@/screens/admin/entity/entity-model';

/** GET|PUT /admin/settings — snake_case ключи. */
export interface AdminSettings {
  supporters_offset: number;
  kaddish_month_rub: number | null;
  requisites: { ru: string; en?: string; he?: string } | null;
  operator: { ru: string; en?: string; he?: string } | null;
  socials: { name: string; url: string }[];
  header_phones: string[];
}

export interface SettingsForm {
  supporters_offset: string;
  kaddish_month_rub: string;
  requisites: Loc;
  operator: Loc;
  /** Построчно: «Имя | https://…». */
  socials: string;
  /** Построчно. */
  header_phones: string;
}

export const settingsForm = (s: Partial<AdminSettings> | undefined): SettingsForm => ({
  supporters_offset: String(s?.supporters_offset ?? 0),
  kaddish_month_rub: s?.kaddish_month_rub == null ? '' : String(s.kaddish_month_rub),
  requisites: toLoc(s?.requisites),
  operator: toLoc(s?.operator),
  socials: (s?.socials ?? []).map((x) => `${x.name} | ${x.url}`).join('\n'),
  header_phones: (s?.header_phones ?? []).join('\n'),
});

const lines = (v: string) =>
  v
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

const parseSocial = (line: string): { name: string; url: string } | null => {
  const i = line.indexOf('|');
  if (i < 0) return null;
  const name = line.slice(0, i).trim();
  const url = line.slice(i + 1).trim();
  return name && /^https?:\/\/\S+$/.test(url) ? { name, url } : null;
};

const INT = /^\d+$/;

export const settingsErrors = (f: SettingsForm): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!INT.test(f.supporters_offset.trim())) out.supporters_offset = 'out_of_range';
  const k = f.kaddish_month_rub.trim();
  if (k && (!INT.test(k) || Number(k) < 1)) out.kaddish_month_rub = 'out_of_range';
  if (lines(f.socials).some((l) => !parseSocial(l))) out.socials = 'url';
  return out;
};

/** Тело PUT: все ключи; очищенное поле — null (бэкенд удаляет ключ, вернётся значение по умолчанию). */
export const settingsBody = (f: SettingsForm): AdminSettings => {
  const k = f.kaddish_month_rub.trim();
  return {
    supporters_offset: Number(f.supporters_offset.trim() || 0),
    kaddish_month_rub: k ? Number(k) : null,
    requisites: fromLoc(f.requisites),
    operator: fromLoc(f.operator),
    socials: lines(f.socials)
      .map(parseSocial)
      .filter((x): x is { name: string; url: string } => !!x),
    header_phones: lines(f.header_phones),
  };
};
