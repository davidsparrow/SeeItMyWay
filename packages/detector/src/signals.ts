import {
  NATIVE_SIGNAL_IDS,
  NATIVE_VALUES,
  type NativeSignal,
  type NativeSignalId,
  type NativeSignals,
  type NativeSnapshot,
  type NativeValueMap,
  type SignalNature,
  type Unsubscribe,
} from '@simw/types';

/** Everything the detector touches, injectable for tests and non-window contexts. */
export interface DetectorEnvironment {
  matchMedia?: ((query: string) => MediaQueryList) | undefined;
  navigator?: Navigator | undefined;
  /** Returns the browser's default font size in px, or null if it can't be measured. */
  measureDefaultFontSize?: (() => number | null) | undefined;
}

const MEDIA_SIGNALS = [
  'prefers-color-scheme',
  'prefers-reduced-motion',
  'prefers-contrast',
  'prefers-reduced-transparency',
  'forced-colors',
  'inverted-colors',
  'prefers-reduced-data',
  'pointer',
  'hover',
  'any-pointer',
  'any-hover',
  'dynamic-range',
  'color-gamut',
] as const satisfies readonly NativeSignalId[];

type MediaSignalId = (typeof MEDIA_SIGNALS)[number];

export const SIGNAL_NATURE: { readonly [K in NativeSignalId]: SignalNature } = {
  'prefers-color-scheme': 'preference',
  'prefers-reduced-motion': 'preference',
  'prefers-contrast': 'preference',
  'prefers-reduced-transparency': 'preference',
  'forced-colors': 'preference',
  'inverted-colors': 'preference',
  'prefers-reduced-data': 'preference',
  'save-data': 'preference',
  'default-font-size': 'preference',
  'global-privacy-control': 'preference',
  pointer: 'environment',
  hover: 'environment',
  'any-pointer': 'environment',
  'any-hover': 'environment',
  'dynamic-range': 'environment',
  'color-gamut': 'environment',
};

/** The value each preference signal has when the visitor hasn't asked for anything. */
export const UNEXPRESSED_VALUE: { readonly [K in NativeSignalId]?: NativeValueMap[K] } = {
  // Media Queries 5: `light` also means "no active preference".
  'prefers-color-scheme': 'light',
  'prefers-reduced-motion': 'no-preference',
  'prefers-contrast': 'no-preference',
  'prefers-reduced-transparency': 'no-preference',
  'forced-colors': 'none',
  'inverted-colors': 'none',
  'prefers-reduced-data': 'no-preference',
  'save-data': 'off',
  'default-font-size': 'standard',
  'global-privacy-control': 'off',
};

export function isExpressed<K extends NativeSignalId>(
  id: K,
  value: NativeValueMap[K] | null,
): boolean {
  if (value === null || SIGNAL_NATURE[id] !== 'preference') return false;
  return value !== UNEXPRESSED_VALUE[id];
}

function defaultEnvironment(): DetectorEnvironment {
  const win = typeof window === 'undefined' ? undefined : window;
  return {
    matchMedia: win?.matchMedia ? win.matchMedia.bind(win) : undefined,
    navigator: typeof navigator === 'undefined' ? undefined : navigator,
    measureDefaultFontSize: () => measureDefaultFontSize(win?.document),
  };
}

/**
 * Measures `font-size: medium`, which browsers map to the visitor's chosen
 * default text size (16px unless they changed it).
 */
export function measureDefaultFontSize(doc: Document | undefined): number | null {
  if (!doc?.body || !doc.defaultView) return null;
  const probe = doc.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;font-size:medium;';
  doc.body.appendChild(probe);
  const px = Number.parseFloat(doc.defaultView.getComputedStyle(probe).fontSize);
  probe.remove();
  return Number.isFinite(px) && px > 0 ? px : null;
}

export function bucketFontSize(px: number): NativeValueMap['default-font-size'] {
  if (px < 15) return 'smaller';
  if (px < 18) return 'standard';
  if (px < 22) return 'larger';
  return 'largest';
}

function readMedia<K extends MediaSignalId>(
  matchMedia: DetectorEnvironment['matchMedia'],
  id: K,
): { supported: boolean; value: NativeValueMap[K] | null } {
  if (!matchMedia) return { supported: false, value: null };
  // Browsers serialize a media query they don't understand as "not all".
  if (matchMedia(`(${id})`).media === 'not all') return { supported: false, value: null };
  const values = [...NATIVE_VALUES[id]] as NativeValueMap[K][];
  // color-gamut matches cumulatively (a p3 screen also matches srgb): test widest first.
  if (id === 'color-gamut') values.reverse();
  for (const value of values) {
    if (matchMedia(`(${id}: ${value})`).matches) return { supported: true, value };
  }
  return { supported: false, value: null };
}

function signal<K extends NativeSignalId>(
  id: K,
  supported: boolean,
  value: NativeValueMap[K] | null,
  source: NativeSignal['source'],
  raw?: NativeSignal['raw'],
): NativeSignal<K> {
  const s: NativeSignal<K> = {
    id,
    supported,
    value: supported ? value : null,
    nature: SIGNAL_NATURE[id],
    expressed: supported && isExpressed(id, value),
    source,
  };
  if (raw !== undefined) s.raw = raw;
  return s;
}

/** Reads every native signal once. Runs entirely in the browser; nothing is sent anywhere. */
export function detectNativeSignals(
  env: DetectorEnvironment = defaultEnvironment(),
): NativeSignals {
  const out = {} as Record<NativeSignalId, NativeSignal>;

  for (const id of MEDIA_SIGNALS) {
    const { supported, value } = readMedia(env.matchMedia, id);
    out[id] = signal(id, supported, value, { kind: 'media', feature: id });
  }

  const connection = (
    env.navigator as (Navigator & { connection?: { saveData?: unknown } }) | undefined
  )?.connection;
  const saveData = connection?.saveData;
  out['save-data'] = signal(
    'save-data',
    typeof saveData === 'boolean',
    saveData === true ? 'on' : 'off',
    { kind: 'navigator', property: 'connection.saveData' },
  );

  const gpc = (env.navigator as (Navigator & { globalPrivacyControl?: unknown }) | undefined)
    ?.globalPrivacyControl;
  out['global-privacy-control'] = signal(
    'global-privacy-control',
    typeof gpc === 'boolean',
    gpc === true ? 'on' : 'off',
    { kind: 'navigator', property: 'globalPrivacyControl' },
  );

  const px = env.measureDefaultFontSize?.() ?? null;
  out['default-font-size'] = signal(
    'default-font-size',
    px !== null,
    px === null ? null : bucketFontSize(px),
    { kind: 'probe', detail: 'computed size of font-size: medium' },
    px ?? undefined,
  );

  return out as NativeSignals;
}

export function toSnapshot(signals: NativeSignals): NativeSnapshot {
  const snapshot: Record<string, string> = {};
  for (const id of NATIVE_SIGNAL_IDS) {
    const s = signals[id];
    if (s.supported && s.value !== null) snapshot[id] = s.value;
  }
  return snapshot as NativeSnapshot;
}

export interface SignalChange {
  id: NativeSignalId;
  from: string | null;
  to: string | null;
}

export function diffSnapshots(prev: NativeSnapshot, next: NativeSnapshot): SignalChange[] {
  const changes: SignalChange[] = [];
  for (const id of NATIVE_SIGNAL_IDS) {
    const from = prev[id] ?? null;
    const to = next[id] ?? null;
    if (from !== to) changes.push({ id, from, to });
  }
  return changes;
}

/**
 * Calls `listener` whenever any native signal changes: live, as the visitor
 * flips a setting in their OS, plus a re-check whenever the tab regains
 * focus (for signals that have no change event, like default font size).
 */
export function watchNativeSignals(
  listener: (signals: NativeSignals, changes: SignalChange[]) => void,
  env: DetectorEnvironment = defaultEnvironment(),
): Unsubscribe {
  let current = toSnapshot(detectNativeSignals(env));
  const recheck = () => {
    const signals = detectNativeSignals(env);
    const next = toSnapshot(signals);
    const changes = diffSnapshots(current, next);
    current = next;
    if (changes.length > 0) listener(signals, changes);
  };

  const cleanups: Array<() => void> = [];
  if (env.matchMedia) {
    for (const id of MEDIA_SIGNALS) {
      for (const value of NATIVE_VALUES[id]) {
        const mql = env.matchMedia(`(${id}: ${value})`);
        if (mql.media === 'not all') continue;
        if (typeof mql.addEventListener === 'function') {
          mql.addEventListener('change', recheck);
          cleanups.push(() => mql.removeEventListener('change', recheck));
        } else if (typeof mql.addListener === 'function') {
          mql.addListener(recheck);
          cleanups.push(() => mql.removeListener(recheck));
        }
      }
    }
  }

  const connection = (env.navigator as (Navigator & { connection?: EventTarget }) | undefined)
    ?.connection;
  if (connection && typeof connection.addEventListener === 'function') {
    connection.addEventListener('change', recheck);
    cleanups.push(() => connection.removeEventListener('change', recheck));
  }

  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    const onVisible = () => {
      if (document.visibilityState === 'visible') recheck();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', recheck);
    cleanups.push(() => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', recheck);
    });
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
