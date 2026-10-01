import { type Href, Redirect, useLocalSearchParams } from 'expo-router';

import { PrayerScreen, isPrayerType } from '@/screens/prayer/prayer-screen';

export default function PrayerRoute() {
  const { type } = useLocalSearchParams<{ type: string }>();
  if (!isPrayerType(type)) return <Redirect href={'/prayers/misheberah' as Href} />;
  return <PrayerScreen key={type} type={type} />;
}
