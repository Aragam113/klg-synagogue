/** Minimal types for react-test-renderer (ships with jest-expo, no @types package installed). Used by store tests. */
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export function act(cb: () => Promise<unknown> | void): Promise<void>;
  export function create(el: ReactElement): { unmount(): void };
}
