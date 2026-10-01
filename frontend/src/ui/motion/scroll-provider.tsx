import { usePathname } from 'expo-router';
import { type ReactNode, useEffect } from 'react';

import { scrollToTop, startEngine, stopEngine } from './engine';

/** Mount once at the root: starts Lenis + rAF, sets html[data-motion], scrolls to top on route change. */
export const ScrollProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  useEffect(() => {
    startEngine();
    return stopEngine;
  }, []);
  useEffect(() => {
    scrollToTop();
  }, [pathname]);
  return <>{children}</>;
};
