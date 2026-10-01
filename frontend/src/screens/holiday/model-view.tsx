import { useLocalSearchParams } from 'expo-router';

import { asApiError } from '@/store';
import { useGetHolidayQuery } from '@/store/api/calendar';

import { holidayState } from './model';
import { HolidayView } from './view';

/** /holidays/[key] — контейнер: ключ из URL → описание и даты праздника в этом году. */
export const HolidayScreen = () => {
  const { key } = useLocalSearchParams<{ key: string }>();
  const q = useGetHolidayQuery({ key: String(key ?? '') }, { skip: !key });
  const error = q.error ? (asApiError(q.error) ?? null) : null;
  return (
    <HolidayView
      state={holidayState(q.data, error)}
      holiday={q.data}
      error={error}
      onRetry={q.refetch}
    />
  );
};
