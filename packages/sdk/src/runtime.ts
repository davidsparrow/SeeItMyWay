import {
  applyExperience,
  DEFAULT_SAFE_ADAPTERS,
  experienceToAttributes,
  experienceToTokens,
  installSafeAdapters,
  type SafeAdapterName,
  type SafeAdapters,
} from '@simw/adapters';
import {
  type DetectorEnvironment,
  detectNativeSignals,
  diffSnapshots,
  type SignalChange,
  toSnapshot,
  watchNativeSignals,
} from '@simw/detector';
import { filterForSharing } from '@simw/privacy';
import {
  createSeed,
  type Experience,
  type ExperienceSources,
  isPreferenceValue,
  isSeed,
  type PartialPreferences,
  type PreferenceKey,
  type PreferencePacket,
  type PreferenceValue,
  resolveExperience,
} from '@simw/protocol';
import type { KeyValueStore, NativeSignals, NativeSnapshot, Unsubscribe } from '@simw/types';
import type { BootSnapshot } from './boot';
import {
  createLocalPassport,
  type PassportSource,
  readPreferences,
  writePreferences,
} from './passport';
import { safeLocalStorage, siteKeys } from './storage';

export interface SeeItMyWayOptions {
  /** Storage namespace for this site's local settings. Defaults to the hostname. */
  site?: string;
  /** Element that receives `data-simw-*` and `--simw-*`. Defaults to `<html>`; `null` = headless. */
  root?: HTMLElement | null;
  /** The site owner's design rules (precedence layer 4). */
  siteDefaults?: PartialPreferences;
  /** Number of anonymous aesthetic variants this site offers. 0 (default) disables the seed. */
  variants?: number;
  /** Level 1 safe adaptations to install, or `false` for none. */
  safeAdapters?: readonly SafeAdapterName[] | false;
  /** Passport source. Defaults to the local V0 profile; `false` ignores Passport entirely. */
  passport?: PassportSource | false;
  storage?: KeyValueStore;
  detector?: DetectorEnvironment;
  onAdapterError?: (name: SafeAdapterName, error: unknown) => void;
}

export interface SeeItMyWayState {
  /** False on the server and before `start()`; components should render defaults. */
  ready: boolean;
  experience: Experience;
  sources: ExperienceSources;
  /** Full detector output (null until started). */
  signals: NativeSignals | null;
  /** What the browser actually says. */
  detected: NativeSnapshot;
  /** What resolution used: `detected` plus any simulation. */
  native: NativeSnapshot;
  simulated: boolean;
  overrides: PartialPreferences;
  passport: PartialPreferences;
  seed: string | null;
}

export interface SeeItMyWay {
  start(): void;
  stop(): void;
  getState(): SeeItMyWayState;
  /** Stable snapshot for server rendering and hydration. */
  getServerState(): SeeItMyWayState;
  subscribe(listener: () => void): Unsubscribe;
  /** Re-read native signals now ("Check Again"). Returns what changed. */
  recheck(): SignalChange[];
  /** Listen for real native changes (not simulations), e.g. to celebrate one. */
  onNativeChange(listener: (changes: SignalChange[]) => void): Unsubscribe;
  setOverride<K extends PreferenceKey>(key: K, value: PreferenceValue<K> | null): void;
  setOverrides(prefs: PartialPreferences): void;
  resetOverrides(): void;
  /** Preview native signals without touching device settings. `null` ends the preview. */
  simulate(native: NativeSnapshot | null): void;
  shuffleSeed(): void;
  /** Exactly what a participating website would receive from this visitor's Passport. */
  sharedPacket(): PreferencePacket;
}

function emptyState(options: SeeItMyWayOptions): SeeItMyWayState {
  const { experience, sources } = resolveExperience({
    native: {},
    siteDefaults: options.siteDefaults ?? null,
  });
  return {
    ready: false,
    experience,
    sources,
    signals: null,
    detected: {},
    native: {},
    simulated: false,
    overrides: {},
    passport: {},
    seed: null,
  };
}

export function createSeeItMyWay(options: SeeItMyWayOptions = {}): SeeItMyWay {
  const serverState = emptyState(options);
  let state = serverState;
  let storage: KeyValueStore | null = null;
  let passport: PassportSource | null = null;
  let simulation: NativeSnapshot | null = null;
  let adapters: SafeAdapters | null = null;
  let running = false;
  const cleanups: Unsubscribe[] = [];
  const listeners = new Set<() => void>();
  const nativeListeners = new Set<(changes: SignalChange[]) => void>();

  const site = () =>
    options.site ??
    (typeof location !== 'undefined' && location.hostname ? location.hostname : 'site');
  const keys = () => siteKeys(site());
  const root = (): HTMLElement | null =>
    options.root === undefined
      ? typeof document === 'undefined'
        ? null
        : document.documentElement
      : options.root;

  function commit(next: Omit<SeeItMyWayState, 'experience' | 'sources'>) {
    const { experience, sources } = resolveExperience({
      native: next.native,
      siteOverrides: next.overrides,
      passport: next.passport,
      siteDefaults: options.siteDefaults ?? null,
      seed: next.seed,
      variants: options.variants ?? 0,
    });
    state = { ...next, experience, sources };

    const el = root();
    if (el) {
      applyExperience(el, experience);
      adapters?.update(experience);
      if (storage && !next.simulated) {
        const snapshot: BootSnapshot = {
          attrs: experienceToAttributes(experience),
          tokens: experienceToTokens(experience),
          followsSystemScheme: sources.colorScheme === 'native',
        };
        storage.set(keys().applied, JSON.stringify(snapshot));
      }
    }
    for (const l of listeners) l();
  }

  function detect(): { signals: NativeSignals; detected: NativeSnapshot } {
    const signals = detectNativeSignals(options.detector);
    return { signals, detected: toSnapshot(signals) };
  }

  function update(patch: Partial<SeeItMyWayState>) {
    const merged = { ...state, ...patch };
    merged.native = simulation ? { ...merged.detected, ...simulation } : merged.detected;
    merged.simulated = simulation !== null;
    commit(merged);
  }

  function loadSeed(store: KeyValueStore): string | null {
    if (!options.variants) return null;
    const existing = store.get(keys().seed);
    if (isSeed(existing)) return existing;
    const seed = createSeed();
    store.set(keys().seed, seed);
    return seed;
  }

  const instance: SeeItMyWay = {
    start() {
      if (running) return;
      running = true;
      storage = options.storage ?? storage ?? safeLocalStorage();
      passport =
        options.passport === false
          ? null
          : (options.passport ?? passport ?? createLocalPassport(storage));

      const el = root();
      if (el && options.safeAdapters !== false && el.ownerDocument) {
        adapters = installSafeAdapters(
          el.ownerDocument,
          state.experience,
          options.safeAdapters ?? DEFAULT_SAFE_ADAPTERS,
          options.onAdapterError,
        );
      }

      const { signals, detected } = detect();
      update({
        ready: true,
        signals,
        detected,
        overrides: readPreferences(storage, keys().overrides),
        passport: passport?.read() ?? {},
        seed: loadSeed(storage),
      });

      cleanups.push(
        watchNativeSignals((nextSignals) => {
          // Diff against our own state so a change already seen by recheck() isn't reported twice.
          const detected = toSnapshot(nextSignals);
          const changes = diffSnapshots(state.detected, detected);
          if (changes.length === 0) return;
          update({ signals: nextSignals, detected });
          for (const l of nativeListeners) l(changes);
        }, options.detector),
      );
      if (passport?.subscribe) {
        cleanups.push(passport.subscribe(() => update({ passport: passport?.read() ?? {} })));
      }
      // Some signals (default font size) need <body>; re-check once it exists.
      if (typeof document !== 'undefined' && document.readyState === 'loading') {
        const onReady = () => instance.recheck();
        document.addEventListener('DOMContentLoaded', onReady, { once: true });
        cleanups.push(() => document.removeEventListener('DOMContentLoaded', onReady));
      }
    },

    stop() {
      if (!running) return;
      running = false;
      while (cleanups.length) cleanups.pop()?.();
      adapters?.uninstall();
      adapters = null;
    },

    getState: () => state,
    getServerState: () => serverState,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    recheck() {
      const { signals, detected } = detect();
      const changes = diffSnapshots(state.detected, detected);
      if (changes.length > 0) {
        update({ signals, detected });
        for (const l of nativeListeners) l(changes);
      }
      return changes;
    },

    onNativeChange(listener) {
      nativeListeners.add(listener);
      return () => nativeListeners.delete(listener);
    },

    setOverride(key, value) {
      const overrides = { ...state.overrides };
      if (value === null) delete overrides[key];
      else if (isPreferenceValue(key, value))
        (overrides as Record<PreferenceKey, string>)[key] = value;
      instance.setOverrides(overrides);
    },

    setOverrides(prefs) {
      if (storage) writePreferences(storage, keys().overrides, prefs);
      update({ overrides: { ...prefs } });
    },

    resetOverrides() {
      storage?.remove(keys().overrides);
      update({ overrides: {} });
    },

    simulate(native) {
      simulation = native;
      update({});
    },

    shuffleSeed() {
      if (!options.variants) return;
      const seed = createSeed();
      storage?.set(keys().seed, seed);
      update({ seed });
    },

    sharedPacket() {
      return filterForSharing(state.passport);
    },
  };

  return instance;
}
