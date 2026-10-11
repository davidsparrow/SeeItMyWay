'use client';

import type { ReactNode } from 'react';
import { SeeItMyWayProvider } from '@simw/sdk/react';
import { SITE_ID } from '@/lib/site';

/**
 * The SeeItMyWay site runs the SeeItMyWay SDK on itself: native signals plus
 * the visitor's locally built Passport decide theme, motion, density, text
 * size, contrast and transparency across every page.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SeeItMyWayProvider options={{ site: SITE_ID, safeAdapters: ['motion'] }}>
      {children}
    </SeeItMyWayProvider>
  );
}
