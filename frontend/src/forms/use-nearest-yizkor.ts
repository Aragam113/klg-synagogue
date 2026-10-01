import { useGetHolidayQuery } from '@/store/api/calendar';
import { kaliningradToday } from '@/utils/kld-time';

import { nearestYizkor, type YizkorDay } from './form-model';

/**
 * Nearest Yizkor day from the calendar API (`GET /calendar/holidays/:key?year=`, this and next year) —
 * the single source of holiday dates. null while loading or if the API is unavailable.
 */
export function useNearestYizkor(skip = false): YizkorDay | null {
  const today = kaliningradToday();
  const y = Number(today.slice(0, 4));
  const o = { skip };
  const pages = [
    useGetHolidayQuery({ key: 'yom-kippur', year: y }, o).data,
    useGetHolidayQuery({ key: 'shmini-atzeret', year: y }, o).data,
    useGetHolidayQuery({ key: 'pesach', year: y }, o).data,
    useGetHolidayQuery({ key: 'shavuot', year: y }, o).data,
    useGetHolidayQuery({ key: 'yom-kippur', year: y + 1 }, o).data,
    useGetHolidayQuery({ key: 'shmini-atzeret', year: y + 1 }, o).data,
    useGetHolidayQuery({ key: 'pesach', year: y + 1 }, o).data,
    useGetHolidayQuery({ key: 'shavuot', year: y + 1 }, o).data,
  ];
  return nearestYizkor(
    today,
    pages.filter((p) => p !== undefined)
  );
}
