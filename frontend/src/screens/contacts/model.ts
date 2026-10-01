import { type Fact, SITE } from '@/config/site';
import type { SectionsContent } from '@/content';
import type { Social, SocialKind } from '@/ui/layout/slots/contacts';

export interface ContactGroup {
  /** Ключ подписи `sections:groups.<key>`. */
  key: string;
  phone: Fact<string>;
  email?: Fact<string>;
}

export interface SocialLink {
  kind: SocialKind;
  label: string;
  /** null — адрес не найден, на странице заглушка. */
  url: string | null;
}

/** /contacts — все телефоны и почты из `site.ts`, соцсети, адрес. */
export interface ContactsViewProps {
  content: SectionsContent['contacts'];
  address: string;
  addressSrc: string;
  groups: ContactGroup[];
  socials: SocialLink[];
}

const GROUPS: ContactGroup[] = [
  { key: 'community', phone: SITE.phones.community, email: SITE.emails.community },
  { key: 'secretary', phone: SITE.phones.secretary },
  { key: 'excursions', phone: SITE.phones.excursions },
  { key: 'museum', phone: SITE.phones.museum, email: SITE.emails.museum },
  { key: 'kosher', phone: SITE.phones.kosher },
  { key: 'trustees', phone: SITE.phones.trustees },
  { key: 'hesed', phone: SITE.phones.hesed, email: SITE.emails.hesed },
  { key: 'sochnut', phone: SITE.phones.sochnut, email: SITE.emails.sochnut },
];

const label = (kind: SocialKind, url: string | null) =>
  kind === 'vk' ? 'VK' : url ? url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : kind;

export const contactsModel = (
  c: SectionsContent,
  lang: 'ru' | 'en' | 'he',
  /** Соцсети: из настроек админки, иначе из site.ts (`useSiteContacts`). */
  socials: Social[]
): ContactsViewProps => ({
  content: c.contacts,
  address: SITE.address.value[lang],
  addressSrc: SITE.address.src,
  groups: GROUPS,
  socials: [
    ...socials.map((s) => ({ kind: s.kind, url: s.url, label: label(s.kind, s.url) })),
    {
      kind: 'site' as const,
      url: SITE.sites.museum.value,
      label: label('site', SITE.sites.museum.value),
    },
  ],
});
