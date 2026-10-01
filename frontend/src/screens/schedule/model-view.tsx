import { useMemo, useState } from 'react';

import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store';
import { useGetDaysQuery } from '@/store/api/calendar';
import { kaliningradNow, monthNames } from '@/utils/kld-time';

import { monthRange, type ScheduleMode } from './model';
import { ScheduleView } from './view';

/** /schedule — контейнер: период (14 дней или месяц/год), вид, зманим → ScheduleView. */
export const ScheduleScreen = () => {
  const { t, lang } = useLang('calendar');
  const today = kaliningradNow(Date.now()).date;
  const thisYear = Number(today.slice(0, 4));

  // month = 0 — «ближайшие 14 дней» (диапазон API по умолчанию)
  const [month, setMonth] = useState(0);
  const [year, setYear] = useState(thisYear);
  const [mode, setMode] = useState<ScheduleMode>('list');
  const [zmanim, setZmanim] = useState(false);

  const q = useGetDaysQuery(month ? monthRange(year, month) : undefined);

  const monthOptions = useMemo(
    () => [
      { value: '0', label: t('page.nextDays') },
      ...monthNames(lang).map((label, i) => ({ value: String(i + 1), label })),
    ],
    [lang, t]
  );
  const yearOptions = [thisYear - 1, thisYear, thisYear + 1].map((y) => ({
    value: String(y),
    label: String(y),
  }));

  return (
    <ScheduleView
      days={q.data ?? []}
      today={today}
      loading={q.isLoading || q.isFetching}
      error={q.error ? (asApiError(q.error) ?? null) : null}
      onRetry={q.refetch}
      month={String(month)}
      onMonth={(v) => setMonth(Number(v))}
      year={String(year)}
      onYear={(v) => {
        setYear(Number(v));
        if (!month) setMonth(1);
      }}
      monthOptions={monthOptions}
      yearOptions={yearOptions}
      mode={mode}
      onMode={setMode}
      zmanim={zmanim}
      onToggleZmanim={() => setZmanim((z) => !z)}
    />
  );
};
