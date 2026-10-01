import type { SectionsContent } from '@/content';
import type { LegalDoc } from '@/content/types';

export type LegalKind = 'privacy' | 'consent';

/** /privacy, /consent — правовые страницы с заглушками оператора. */
export interface LegalViewProps {
  kind: LegalKind;
  doc: LegalDoc;
}

const OPERATOR_PH = /\[ВПИШИ: наименование организации[^\]]*\]/g;

/** Оператор ПДн из настроек админки (если заполнен) подставляется вместо заглушки организации. */
export const legalModel = (
  c: SectionsContent,
  kind: LegalKind,
  operator: string | null
): LegalViewProps => {
  const doc = c.legal[kind];
  if (!operator) return { kind, doc };
  return {
    kind,
    doc: {
      ...doc,
      sections: doc.sections.map((s) => ({
        ...s,
        paragraphs: s.paragraphs.map((p) => p.replace(OPERATOR_PH, operator)),
      })),
    },
  };
};

/** Куски абзаца: «[ВПИШИ: …]» → `{ph: true, text: '…'}`, остальное — как есть. */
export const splitPlaceholders = (text: string): { ph: boolean; text: string }[] =>
  text
    .split(/(\[ВПИШИ: [^\]]+\])/)
    .filter((s) => s !== '')
    .map((part) => {
      const m = /^\[ВПИШИ: ([^\]]+)\]$/.exec(part);
      return m ? { ph: true, text: m[1] } : { ph: false, text: part };
    });
