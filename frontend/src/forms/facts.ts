/**
 * Факты для форм — только ссылки на `@/config/site` (единственный источник фактов): своих телефонов,
 * цен, времени и имён здесь нет. null = не найдено в источниках → на экране видимая <Placeholder>.
 */
import { SITE } from '@/config/site';

/** §4 «Экскурсия в синагогу». */
export const EXCURSION = {
  priceStandardRub: SITE.prices.excursion.value.standard,
  priceReducedRub: SITE.prices.excursion.value.reduced,
  /** Зеркалит backend/src/modules/requests/dto/request-forms.dto.ts → EXCURSION_TIMES: меняешь здесь — поменяй и там. */
  times: SITE.hours.excursionSlots.value,
  /** Зеркалит backend/src/modules/requests/dto/request-forms.dto.ts → EXCURSION_LANGS. */
  languages: SITE.excursionLanguages.value,
  departmentPhone: SITE.phones.excursions.value,
} as const;

/** §3 «Приёмная раввина» / «Приёмная синагоги» (TL-recep): номера совпадают с общинным и секретарём. */
export const RECEPTION = {
  rabbiPhone: SITE.phones.community.value,
  synagoguePhone: SITE.phones.secretary.value,
  hours: SITE.unknown.receptionHours as string | null,
};

/** §3 «Руководство». */
export const LEADERS = {
  rabbi: SITE.people.rabbi.value,
  chairman: SITE.people.chairman.value,
} as const;

export const nameIn = (n: { ru: string; en: string; he: string }, lang: string) =>
  lang === 'en' ? n.en : lang === 'he' ? n.he : n.ru;
