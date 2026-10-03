import { type Href, Redirect } from 'expo-router';

/** /holidays has no page of its own: holidays live in the schedule (each links to /holidays/[key]). */
export default function HolidaysIndex() {
  return <Redirect href={'/schedule' as Href} />;
}
