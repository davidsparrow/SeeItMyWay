/**
 * Shared shapes used across SeeItMyWay packages.
 *
 * Native signal ids are named after the web standard they come from (CSS media
 * features, HTTP client hints, navigator properties), so "Layer A" in the PRD
 * maps one-to-one onto real, existing standards.
 */

/** Every native signal SeeItMyWay knows how to read, with its possible values. */
export interface NativeValueMap {
  /** `light` also covers "no preference expressed" (per Media Queries Level 5). */
  'prefers-color-scheme': 'light' | 'dark';
  'prefers-reduced-motion': 'no-preference' | 'reduce';
  'prefers-contrast': 'no-preference' | 'more' | 'less' | 'custom';
  'prefers-reduced-transparency': 'no-preference' | 'reduce';
  'forced-colors': 'none' | 'active';
  'inverted-colors': 'none' | 'inverted';
  'prefers-reduced-data': 'no-preference' | 'reduce';
  /** Save-Data client hint, read via `navigator.connection.saveData`. */
  'save-data': 'off' | 'on';
  /** The browser's default font size, bucketed. Read by measuring `font-size: medium`. */
  'default-font-size': 'smaller' | 'standard' | 'larger' | 'largest';
  /** Global Privacy Control, `navigator.globalPrivacyControl`. */
  'global-privacy-control': 'off' | 'on';
  pointer: 'none' | 'coarse' | 'fine';
  hover: 'none' | 'hover';
  'any-pointer': 'none' | 'coarse' | 'fine';
  'any-hover': 'none' | 'hover';
  'dynamic-range': 'standard' | 'high';
  'color-gamut': 'srgb' | 'p3' | 'rec2020';
}

export type NativeSignalId = keyof NativeValueMap;
export type NativeValue<K extends NativeSignalId = NativeSignalId> = NativeValueMap[K];

/**
 * The PRD requires the interface to distinguish an explicit user preference
 * from a device/environment characteristic. Touch capability, for example, is
 * never described as a preference.
 */
export type SignalNature = 'preference' | 'environment';

export type SignalSource =
  | { kind: 'media'; feature: string }
  | { kind: 'navigator'; property: string }
  | { kind: 'probe'; detail: string };

export interface NativeSignal<K extends NativeSignalId = NativeSignalId> {
  id: K;
  /** False when this browser does not expose the signal at all. */
  supported: boolean;
  /** Null when unsupported. */
  value: NativeValueMap[K] | null;
  nature: SignalNature;
  /**
   * True when a preference signal is actively asking for something other than
   * the default. Always false for environment signals.
   */
  expressed: boolean;
  source: SignalSource;
  /** Extra raw reading, e.g. the measured default font size in px. */
  raw?: string | number | boolean;
}

export type NativeSignals = { [K in NativeSignalId]: NativeSignal<K> };

/** Only the values of supported signals; what the precedence resolver consumes. */
export type NativeSnapshot = { [K in NativeSignalId]?: NativeValueMap[K] };

export type OperatingSystem =
  | 'ios'
  | 'ipados'
  | 'macos'
  | 'windows'
  | 'android'
  | 'chromeos'
  | 'linux'
  | 'unknown';

export type BrowserFamily =
  | 'chrome'
  | 'edge'
  | 'firefox'
  | 'safari'
  | 'samsung'
  | 'opera'
  | 'brave'
  | 'other';

export interface PlatformInfo {
  os: OperatingSystem;
  browser: BrowserFamily;
  mobile: boolean;
}

/** Minimal synchronous key/value storage (localStorage-shaped, but injectable). */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export type Unsubscribe = () => void;

/** Runtime catalog of every native signal and its possible values. */
export const NATIVE_VALUES: { readonly [K in NativeSignalId]: readonly NativeValueMap[K][] } = {
  'prefers-color-scheme': ['light', 'dark'],
  'prefers-reduced-motion': ['no-preference', 'reduce'],
  'prefers-contrast': ['no-preference', 'more', 'less', 'custom'],
  'prefers-reduced-transparency': ['no-preference', 'reduce'],
  'forced-colors': ['none', 'active'],
  'inverted-colors': ['none', 'inverted'],
  'prefers-reduced-data': ['no-preference', 'reduce'],
  'save-data': ['off', 'on'],
  'default-font-size': ['smaller', 'standard', 'larger', 'largest'],
  'global-privacy-control': ['off', 'on'],
  pointer: ['none', 'coarse', 'fine'],
  hover: ['none', 'hover'],
  'any-pointer': ['none', 'coarse', 'fine'],
  'any-hover': ['none', 'hover'],
  'dynamic-range': ['standard', 'high'],
  'color-gamut': ['srgb', 'p3', 'rec2020'],
};

export const NATIVE_SIGNAL_IDS = Object.keys(NATIVE_VALUES) as NativeSignalId[];
