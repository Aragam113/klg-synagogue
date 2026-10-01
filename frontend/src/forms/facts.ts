/**
 * Facts for the forms. Source of every value: .autopilot/ref/kld-content.md (section named in the comment).
 * null = not found in the sources → the screen shows a visible <Placeholder>.
 */

/** §4 «Экскурсия в синагогу» (OF-tour, снимок 16.06.2026, дословно). */
export const EXCURSION = {
  priceStandardRub: 300,
  priceReducedRub: 200,
  /** Зеркалит backend/src/modules/requests/dto/request-forms.dto.ts → EXCURSION_TIMES: меняешь здесь — поменяй и там. */
  times: ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
  /**
   * Языки экскурсии — §4 (VK-mus: «на русском, немецком и английском»); иврита в источнике нет.
   * Зеркалит backend/src/modules/requests/dto/request-forms.dto.ts → EXCURSION_LANGS.
   */
  languages: ['ru', 'de', 'en'],
  departmentPhone: '+79097918178',
} as const;

/** §3 «Приёмная раввина» / «Приёмная синагоги» (TL-recep). */
export const RECEPTION = {
  rabbiPhone: '+7 (4012) 46-43-45',
  synagoguePhone: '+7 909 777-12-30',
  /** Часы приёма — НЕ НАЙДЕНО в kld-content. */
  hours: null as string | null,
};

/** §3 «Руководство»: раввин — OF-home; председатель — GOTOV. */
export const LEADERS = {
  rabbi: { ru: 'Давид Шведик', en: 'David Shvedik' },
  chairman: { ru: 'Леонид Плитман', en: 'Leonid Plitman' },
} as const;

export const nameIn = (n: { ru: string; en: string }, lang: string) =>
  lang === 'ru' ? n.ru : n.en;
