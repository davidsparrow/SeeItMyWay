'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createSeeItMyWay, safeLocalStorage, type SeeItMyWay } from '@simw/sdk';
import { CHECKUP_KEYS, NORTHLIGHT_SITE_ID } from '@/lib/site';
import type { Tone } from './content';

/**
 * Northlight is a separate "participating website", so it runs its own
 * headless SeeItMyWay runtime: its own Tune overrides and anonymous seed,
 * the visitor's shared Passport, and the same native signals. Headless
 * means it renders into its own scoped element, not into <html>.
 */
let instance: SeeItMyWay | null = null;
function northlight(): SeeItMyWay {
  instance ??= createSeeItMyWay({
    site: NORTHLIGHT_SITE_ID,
    root: null,
    variants: 4,
    safeAdapters: false,
    // Northlight's design rules: a visually rich site by default.
    siteDefaults: { visualRichness: 'rich' },
  });
  return instance;
}

export function useNorthlight() {
  const sdk = northlight();
  const state = useSyncExternalStore(sdk.subscribe, sdk.getState, sdk.getServerState);
  useEffect(() => {
    sdk.start();
    return () => sdk.stop();
  }, [sdk]);
  return { sdk, state };
}

const TONES: readonly Tone[] = ['serious', 'balanced', 'playful'];

export function useNorthlightTone(): [Tone, (tone: Tone) => void] {
  const [tone, setTone] = useState<Tone>('balanced');
  useEffect(() => {
    const saved = safeLocalStorage().get(CHECKUP_KEYS.northlightTone);
    if (saved && (TONES as readonly string[]).includes(saved)) setTone(saved as Tone);
  }, []);
  return [
    tone,
    (next) => {
      setTone(next);
      safeLocalStorage().set(CHECKUP_KEYS.northlightTone, next);
    },
  ];
}
