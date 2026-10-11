import type { NativeSnapshot } from '@simw/types';
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_KEYS,
  atLeast,
  isPreferenceValue,
  type PartialPreferences,
  type PreferenceKey,
  type SIMWPreferences,
} from './vocabulary';
import { seedToVariant } from './seed';

/**
 * Where a resolved value came from, highest priority first (PRD §20):
 *
 * 1. `native`        accessibility / browser / OS requirement
 * 2. `site-override` explicit local visitor choice on this site ("Tune This Site")
 * 3. `passport`      the visitor's portable SeeItMyWay preferences
 * 4. `site-default`  the site owner's design rules
 * 5. `seed`          anonymous aesthetic variation
 *
 * `protocol-default` means nobody said anything.
 */
export type Layer =
  'native' | 'site-override' | 'passport' | 'site-default' | 'seed' | 'protocol-default';

export const PRECEDENCE: ReadonlyArray<{ layer: Layer; label: string; description: string }> = [
  {
    layer: 'native',
    label: 'Your device',
    description: 'Accessibility, browser and operating-system preferences. These always win.',
  },
  {
    layer: 'site-override',
    label: 'Set on this site',
    description: 'Choices you made with this site’s Tune controls.',
  },
  {
    layer: 'passport',
    label: 'Your Passport',
    description: 'Preferences you carry between participating sites.',
  },
  {
    layer: 'site-default',
    label: 'Site design',
    description: 'How the site owner designed it.',
  },
  {
    layer: 'seed',
    label: 'Random variation',
    description: 'Harmless, anonymous aesthetic variety. Never overrides anything above.',
  },
];

export type ResolvedColorScheme = 'light' | 'dark';

/** Everything an adaptive site needs to render, fully resolved. */
export interface Experience extends Omit<SIMWPreferences, 'colorScheme'> {
  /** `system` is resolved to what the device says. */
  colorScheme: ResolvedColorScheme;
  contrast: 'standard' | 'more' | 'less';
  transparency: 'standard' | 'reduced';
  forcedColors: boolean;
  data: 'standard' | 'reduced';
  /** Environment, not preference: how the visitor points at things. */
  pointer: 'fine' | 'coarse' | 'none';
  /** Environment, not preference: whether hovering is possible. */
  hover: boolean;
  /** Seed-derived aesthetic variant, or null when variation is off or unsafe. */
  variant: number | null;
}

export type ExperienceKey = keyof Experience;
export type ExperienceSources = { [K in ExperienceKey]: Layer };

export interface ResolveInput {
  native: NativeSnapshot;
  siteOverrides?: PartialPreferences | null;
  passport?: PartialPreferences | null;
  siteDefaults?: PartialPreferences | null;
  seed?: string | null;
  /** How many aesthetic variants the site offers. 0 disables variation. */
  variants?: number;
}

export interface Resolution {
  experience: Experience;
  sources: ExperienceSources;
}

const LAYER_ORDER = ['site-override', 'passport', 'site-default'] as const;

/**
 * Resolves every layer into one experience.
 *
 * Native accessibility signals act as floors that later layers cannot loosen:
 * if the OS asks for reduced motion, a Passport saying "full" does not win.
 * The native color scheme is different. It's a default that an explicit
 * choice may override, because choosing dark for one site is not an
 * accessibility conflict.
 */
export function resolveExperience(input: ResolveInput): Resolution {
  const { native } = input;
  const layers: Record<(typeof LAYER_ORDER)[number], PartialPreferences | null | undefined> = {
    'site-override': input.siteOverrides,
    passport: input.passport,
    'site-default': input.siteDefaults,
  };

  const prefs = { ...DEFAULT_PREFERENCES } as SIMWPreferences;
  const prefSources = {} as Record<PreferenceKey, Layer>;

  for (const key of PREFERENCE_KEYS) {
    prefSources[key] = 'protocol-default';
    for (const layer of LAYER_ORDER) {
      const value = layers[layer]?.[key];
      if (value !== undefined && isPreferenceValue(key, value)) {
        (prefs as Record<PreferenceKey, string>)[key] = value;
        prefSources[key] = layer;
        break;
      }
    }
  }

  // Native floors.
  const raise = <K extends 'motion' | 'autoplay'>(key: K, floor: SIMWPreferences[K]) => {
    const raised = atLeast(key, prefs[key], floor);
    if (raised !== prefs[key]) {
      prefs[key] = raised;
      prefSources[key] = 'native';
    }
  };

  const reducedMotion = native['prefers-reduced-motion'] === 'reduce';
  const reducedData = native['prefers-reduced-data'] === 'reduce' || native['save-data'] === 'on';

  if (reducedMotion) {
    raise('motion', 'reduced');
    // Autoplaying video is motion. A hero video that ignores reduced motion is
    // the textbook failure, so reduced motion also means no autoplay.
    raise('autoplay', 'never');
  }
  if (reducedData) raise('autoplay', 'never');

  // Color scheme: explicit choice wins over the device; "system" follows it.
  let colorScheme: ResolvedColorScheme;
  let colorSource: Layer;
  if (prefs.colorScheme === 'system') {
    colorScheme = native['prefers-color-scheme'] === 'dark' ? 'dark' : 'light';
    colorSource = native['prefers-color-scheme'] ? 'native' : prefSources.colorScheme;
  } else {
    colorScheme = prefs.colorScheme;
    colorSource = prefSources.colorScheme;
  }

  const forcedColors = native['forced-colors'] === 'active';
  const contrastSignal = native['prefers-contrast'];
  const contrast: Experience['contrast'] =
    contrastSignal === 'more' || contrastSignal === 'less' ? contrastSignal : 'standard';
  const transparency: Experience['transparency'] =
    native['prefers-reduced-transparency'] === 'reduce' ? 'reduced' : 'standard';
  const pointer = native.pointer ?? 'fine';
  const hover = native.hover ? native.hover === 'hover' : pointer === 'fine';

  // The seed is decoration only. It switches off whenever palette variation
  // could fight an accessibility request.
  const variantCount = input.variants ?? 0;
  const variationUnsafe = forcedColors || contrast === 'more';
  const variant =
    input.seed && variantCount > 0 && !variationUnsafe
      ? seedToVariant(input.seed, variantCount)
      : null;

  const { colorScheme: _ignored, ...rest } = prefs;
  const experience: Experience = {
    ...rest,
    colorScheme,
    contrast,
    transparency,
    forcedColors,
    data: reducedData ? 'reduced' : 'standard',
    pointer,
    hover,
    variant,
  };

  const { colorScheme: _ignoredSource, ...restSources } = prefSources;
  const sources: ExperienceSources = {
    ...restSources,
    colorScheme: colorSource,
    contrast: 'native',
    transparency: 'native',
    forcedColors: 'native',
    data: 'native',
    pointer: 'native',
    hover: 'native',
    variant: variant === null && variationUnsafe && input.seed ? 'native' : 'seed',
  };

  return { experience, sources };
}

/** The experience a site renders when nothing at all is known (e.g. on the server). */
export const DEFAULT_EXPERIENCE: Experience = resolveExperience({ native: {} }).experience;
