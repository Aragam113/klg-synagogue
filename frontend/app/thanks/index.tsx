import { type Href, Redirect } from 'expo-router';

/** /thanks without a payment id → home. */
export default function ThanksIndex() {
  return <Redirect href={'/' as Href} />;
}
