import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store';
import { useGetFundraisersQuery, useGetPublicSettingsQuery } from '@/store/api/content';
import { useGetDedicationsQuery, useGetPaymentModeQuery } from '@/store/api/payments';

import { dedicationItems } from './donate-model';
import { DonateView } from './view';

/** /donate */
export const DonateScreen = () => {
  const { t, lang } = useLang('payments');
  const settings = useGetPublicSettingsQuery({ lang }, { refetchOnMountOrArgChange: true });
  const funds = useGetFundraisersQuery({ lang }, { refetchOnMountOrArgChange: true });
  const dedications = useGetDedicationsQuery({ limit: 20 }, { refetchOnMountOrArgChange: true });
  const mode = useGetPaymentModeQuery();
  return (
    <DonateView
      supportersCount={settings.data?.supportersCount ?? null}
      requisites={settings.data ? settings.data.requisites : undefined}
      fundraisers={funds.data ?? []}
      fundraisersError={funds.error ? (asApiError(funds.error) ?? null) : null}
      onRetry={funds.refetch}
      dedications={dedicationItems(dedications.data ?? [], t('donate.anonymous'))}
      testMode={mode.data?.mode !== 'real'}
    />
  );
};
