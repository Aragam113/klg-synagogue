import { useLocalSearchParams } from 'expo-router';

import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store';
import { useGetFundraiserQuery, useGetPublicSettingsQuery } from '@/store/api/content';

import { FundraiserView } from './view';

/** /fundraisers/[slug] */
export const FundraiserScreen = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { lang } = useLang('payments');
  const q = useGetFundraiserQuery({ lang, slug: String(slug ?? '') }, { skip: !slug });
  const settings = useGetPublicSettingsQuery({ lang });
  const error = q.error ? (asApiError(q.error) ?? null) : null;
  return (
    <FundraiserView
      fundraiser={q.data}
      notFound={error?.status === 404}
      error={error?.status === 404 ? null : error}
      onRetry={q.refetch}
      requisites={settings.data ? settings.data.requisites : undefined}
    />
  );
};
