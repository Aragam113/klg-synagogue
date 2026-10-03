import { type Href, Redirect } from 'expo-router';

/** /fundraisers → the donate page, which lists the active fundraisers. */
export default function FundraisersIndex() {
  return <Redirect href={'/donate' as Href} />;
}
