/**
 * SLOT: contacts for the header/footer/pages.
 * Editable facts (`/settings/public`: headerPhones, socials, operator, requisites) belong to the admin
 * settings; `src/config/site.ts` (every value with a source URL) is only the fallback
 * while settings are empty, still placeholders, or the API is unreachable.
 * null = not known yet -> a visible [ВПИШИ: ...] placeholder. Labels for placeholders: common:footer.<field>.
 */
import { MAPS, SITE } from '@/config/site';
import type { PublicSettings } from '@/store/api/content';

export interface Contacts {
  address: { ru: string; en?: string; he?: string } | null;
  phone: string | null;
  email: string | null;
  /** Map link for the address (Yandex/Google), optional. */
  mapUrl: string | null;
}

export type SocialKind = 'telegram' | 'vk' | 'youtube' | 'instagram' | 'whatsapp' | 'site';
export interface Social {
  kind: SocialKind;
  url: string | null;
}

/** Fallback from site.ts (address/email are not editable in settings). */
export const CONTACTS: Contacts = {
  address: SITE.address.value,
  phone: SITE.phones.community.value,
  email: SITE.emails.community.value,
  mapUrl: MAPS.yandex,
};

/** Fallback from site.ts; url null = placeholder (Telegram общины в источниках не найден). */
export const SOCIALS: Social[] = [
  { kind: 'vk', url: SITE.sites.vk.value },
  { kind: 'site', url: SITE.sites.gotov.value },
  { kind: 'telegram', url: SITE.unknown.telegram },
];

/** Value really filled in by the editor (not empty, not a seed placeholder). */
const filled = (s: string | null | undefined): s is string =>
  !!s && !!s.trim() && !s.trim().startsWith('[ВПИШИ');

const kindOf = (name: string, url: string): SocialKind => {
  const k = `${name} ${url}`.toLowerCase();
  if (/telegram|t\.me/.test(k)) return 'telegram';
  if (/\bvk\b|vk\.com|вконтакте/.test(k)) return 'vk';
  if (/youtu/.test(k)) return 'youtube';
  if (/instagram/.test(k)) return 'instagram';
  if (/whatsapp|wa\.me/.test(k)) return 'whatsapp';
  return 'site';
};

export interface SiteContacts {
  phone: string | null;
  phones: string[];
  socials: Social[];
  operator: string | null;
  requisites: string | null;
}

/** Settings from the admin when filled, otherwise site.ts. */
export const pickContacts = (s: PublicSettings | undefined): SiteContacts => {
  const operator = s?.operator;
  const requisites = s?.requisites;
  const phones = (s?.headerPhones ?? []).filter(filled);
  const socials = (s?.socials ?? [])
    .filter((x) => filled(x.url))
    .map((x) => ({ kind: kindOf(x.name, x.url), url: x.url }));
  const allPhones = phones.length ? phones : CONTACTS.phone ? [CONTACTS.phone] : [];
  return {
    phone: allPhones[0] ?? null,
    phones: allPhones,
    socials: socials.length ? socials : SOCIALS,
    operator: filled(operator) ? operator : SITE.unknown.operator,
    requisites: filled(requisites) ? requisites : null,
  };
};
