/**
 * SLOT owned by task 06 (static pages): fill from .autopilot/ref/kld-content.md (with a source comment per value).
 * null = not known yet -> footer/header show a visible [ВПИШИ: ...] placeholder.
 * Labels for placeholders: common:footer.<field>.
 */
export interface Contacts {
  address: { ru: string; en?: string; he?: string } | null;
  phone: string | null;
  email: string | null;
  /** Map link for the address (Yandex/Google), optional. */
  mapUrl: string | null;
}

export type SocialKind = 'telegram' | 'vk' | 'youtube' | 'instagram' | 'whatsapp' | 'site';

export const CONTACTS: Contacts = {
  address: null,
  phone: null,
  email: null,
  mapUrl: null,
};

/** url null = placeholder. */
export const SOCIALS: { kind: SocialKind; url: string | null }[] = [
  { kind: 'telegram', url: null },
  { kind: 'vk', url: null },
  { kind: 'youtube', url: null },
];
