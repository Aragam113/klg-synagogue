import { type Href, Redirect } from 'expo-router';

/** /prayers → the first prayer form; its tabs switch between the prayer types. */
export default function PrayersIndex() {
  return <Redirect href={'/prayers/misheberah' as Href} />;
}
