'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { Experience } from '@simw/protocol';
import {
  createSeeItMyWay,
  type SeeItMyWay,
  type SeeItMyWayOptions,
  type SeeItMyWayState,
} from './runtime';

const SeeItMyWayContext = createContext<SeeItMyWay | null>(null);

export interface SeeItMyWayProviderProps {
  /** Options for a new runtime, or pass an existing `instance`. */
  options?: SeeItMyWayOptions;
  instance?: SeeItMyWay;
  children: ReactNode;
}

/**
 * Starts the runtime on the client after hydration. During server rendering
 * and the first client render, components see the default experience; the
 * inline boot script has already applied the visitor's attributes to
 * `<html>`, so CSS is right from the first paint.
 */
export function SeeItMyWayProvider({ options, instance, children }: SeeItMyWayProviderProps) {
  const [sdk] = useState(() => instance ?? createSeeItMyWay(options));
  useEffect(() => {
    sdk.start();
    return () => sdk.stop();
  }, [sdk]);
  return <SeeItMyWayContext.Provider value={sdk}>{children}</SeeItMyWayContext.Provider>;
}

export function useSeeItMyWayInstance(): SeeItMyWay {
  const sdk = useContext(SeeItMyWayContext);
  if (!sdk) throw new Error('useSeeItMyWay must be used inside <SeeItMyWayProvider>.');
  return sdk;
}

/** The full runtime state, kept in sync with native changes, Passport and overrides. */
export function useSeeItMyWay(): SeeItMyWayState {
  const sdk = useSeeItMyWayInstance();
  return useSyncExternalStore(sdk.subscribe, sdk.getState, sdk.getServerState);
}

/** Shorthand for the resolved experience: `const { motion, density } = useExperience()`. */
export function useExperience(): Experience {
  return useSeeItMyWay().experience;
}
