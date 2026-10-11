/**
 * SeeItMyWay preference vocabulary (PRD §14).
 *
 * Deliberately small and deliberately coarse (§15): every preference is a
 * named bucket, never a number, so thousands of visitors plausibly share the
 * same combination. Values are ordered from "most" to "least" of the thing
 * the preference controls where an order exists.
 */

export type SharingClass = 'universal' | 'ask-first';

export interface PreferenceDefinition<V extends string = string> {
  key: string;
  label: string;
  /** One plain-English sentence for people, not developers. */
  description: string;
  values: readonly V[];
  valueLabels: Readonly<Record<V, string>>;
  default: V;
  /** §16: universal preferences may be shared automatically; ask-first never are. */
  sharing: SharingClass;
  /** The two ends of the scale, for slider-style UI (`CALMER ○──●──○ LIVELIER`). */
  poles: readonly [string, string];
}

function define<const V extends string>(def: PreferenceDefinition<V>): PreferenceDefinition<V> {
  return def;
}

export const VOCABULARY = {
  colorScheme: define({
    key: 'colorScheme',
    label: 'Theme',
    description: 'Light or dark interfaces. "System" follows what your device already says.',
    values: ['system', 'light', 'dark'],
    valueLabels: { system: 'System', light: 'Light', dark: 'Dark' },
    default: 'system',
    sharing: 'universal',
    poles: ['Light', 'Dark'],
  }),
  motion: define({
    key: 'motion',
    label: 'Motion',
    description: 'How much things move: animations, parallax, sliding transitions.',
    values: ['full', 'reduced', 'minimal'],
    valueLabels: { full: 'Full', reduced: 'Reduced', minimal: 'Minimal' },
    default: 'full',
    sharing: 'universal',
    poles: ['Livelier', 'Calmer'],
  }),
  density: define({
    key: 'density',
    label: 'Interface density',
    description: 'How tightly things are packed on screen.',
    values: ['compact', 'standard', 'roomy'],
    valueLabels: { compact: 'Compact', standard: 'Standard', roomy: 'Roomy' },
    default: 'standard',
    sharing: 'universal',
    poles: ['Compact', 'Roomy'],
  }),
  textSize: define({
    key: 'textSize',
    label: 'Text size',
    description: 'How large body text should be.',
    values: ['standard', 'larger', 'largest'],
    valueLabels: { standard: 'Standard', larger: 'Larger', largest: 'Largest' },
    default: 'standard',
    sharing: 'universal',
    poles: ['Standard', 'Largest'],
  }),
  navigation: define({
    key: 'navigation',
    label: 'Navigation',
    description: 'Lots of menu choices at once, or a few clear ones.',
    values: ['compact', 'standard', 'simplified'],
    valueLabels: { compact: 'Compact', standard: 'Standard', simplified: 'Simplified' },
    default: 'standard',
    sharing: 'universal',
    poles: ['Everything', 'Simple'],
  }),
  autoplay: define({
    key: 'autoplay',
    label: 'Autoplay',
    description: 'Whether video and audio may start on their own.',
    values: ['allowed', 'muted', 'never'],
    valueLabels: { allowed: 'Allowed', muted: 'Muted only', never: 'Never' },
    default: 'allowed',
    sharing: 'universal',
    poles: ['Allowed', 'Never'],
  }),
  detail: define({
    key: 'detail',
    label: 'Content detail',
    description: 'The short version or the full story.',
    values: ['brief', 'standard', 'detailed'],
    valueLabels: { brief: 'Brief', standard: 'Standard', detailed: 'Detailed' },
    default: 'standard',
    sharing: 'universal',
    poles: ['Concise', 'Detailed'],
  }),
  visualRichness: define({
    key: 'visualRichness',
    label: 'Visual richness',
    description: 'Plain and quiet, or full of imagery and atmosphere.',
    values: ['minimal', 'standard', 'rich'],
    valueLabels: { minimal: 'Minimal', standard: 'Standard', rich: 'Rich' },
    default: 'standard',
    sharing: 'universal',
    poles: ['Minimal', 'Rich'],
  }),
  instructions: define({
    key: 'instructions',
    label: 'Instructions',
    description: 'Just the gist, or every step spelled out.',
    values: ['concise', 'standard', 'step-by-step'],
    valueLabels: { concise: 'Concise', standard: 'Standard', 'step-by-step': 'Step-by-step' },
    default: 'standard',
    sharing: 'universal',
    poles: ['Quick', 'Step-by-step'],
  }),
  captions: define({
    key: 'captions',
    label: 'Captions',
    description: 'Whether captions show on video by default.',
    values: ['default', 'prefer', 'always'],
    valueLabels: { default: 'Site default', prefer: 'Prefer', always: 'Always when available' },
    default: 'default',
    sharing: 'universal',
    poles: ['Site default', 'Always'],
  }),
  controls: define({
    key: 'controls',
    label: 'Controls',
    description: 'Standard buttons, or larger, easier-to-hit ones.',
    values: ['standard', 'larger'],
    valueLabels: { standard: 'Standard', larger: 'Larger' },
    default: 'standard',
    sharing: 'universal',
    poles: ['Standard', 'Larger'],
  }),
} as const;

export type PreferenceKey = keyof typeof VOCABULARY;

type ValuesOf<K extends PreferenceKey> = (typeof VOCABULARY)[K]['values'][number];

/** A complete SeeItMyWay preference profile. */
export type SIMWPreferences = { [K in PreferenceKey]: ValuesOf<K> };

/** Any subset of a profile; what layers (Passport, site overrides, defaults) carry. */
export type PartialPreferences = Partial<SIMWPreferences>;

export type PreferenceValue<K extends PreferenceKey = PreferenceKey> = SIMWPreferences[K];

export const PREFERENCE_KEYS = Object.keys(VOCABULARY) as PreferenceKey[];

export const DEFAULT_PREFERENCES: SIMWPreferences = Object.fromEntries(
  PREFERENCE_KEYS.map((key) => [key, VOCABULARY[key].default]),
) as SIMWPreferences;

// A Set rather than `Object.hasOwn`: the SDK's script-tag build targets ES2017.
const KEY_SET: ReadonlySet<string> = new Set(PREFERENCE_KEYS);

export function isPreferenceKey(key: unknown): key is PreferenceKey {
  return typeof key === 'string' && KEY_SET.has(key);
}

export function isPreferenceValue<K extends PreferenceKey>(
  key: K,
  value: unknown,
): value is PreferenceValue<K> {
  return (VOCABULARY[key].values as readonly unknown[]).includes(value);
}

export function definitionOf<K extends PreferenceKey>(key: K): (typeof VOCABULARY)[K] {
  return VOCABULARY[key];
}

/** Position of a value on its scale (0-based). */
export function rankOf<K extends PreferenceKey>(key: K, value: PreferenceValue<K>): number {
  return (VOCABULARY[key].values as readonly string[]).indexOf(value);
}

/**
 * Returns whichever of `value` and `floor` sits further along the scale.
 * Used to enforce native requirements: e.g. an OS "reduce motion" request
 * raises motion to at least `reduced`, and nothing lower can override it.
 */
export function atLeast<K extends PreferenceKey>(
  key: K,
  value: PreferenceValue<K>,
  floor: PreferenceValue<K>,
): PreferenceValue<K> {
  return rankOf(key, value) >= rankOf(key, floor) ? value : floor;
}
