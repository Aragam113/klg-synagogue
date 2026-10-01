import { useLang } from '@/i18n/use-lang';
import { Placeholder, Text, Title } from '@/ui/kit';

/** «Перевод по реквизитам»: requisites from site settings, otherwise the visible placeholder. */
export const Requisites = ({ requisites }: { requisites: string | null | undefined }) => {
  const { t } = useLang('payments');
  const real = requisites && !requisites.includes('[ВПИШИ') ? requisites : null;
  return (
    <div className="don-req" data-requisites>
      <Title as="h2" size="sm" text={t('requisites.title')} />
      <Text>{t('requisites.lead')}</Text>
      {real ? (
        <pre>{real}</pre>
      ) : (
        <Placeholder>
          {requisites?.replace(/^\[ВПИШИ:\s*|\]$/g, '') || t('requisites.missing')}
        </Placeholder>
      )}
    </div>
  );
};
