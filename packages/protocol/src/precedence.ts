import type { NativeSnapshot } from '@simw/types';
import { seedToVariant } from './seed';
import {
  atLeast,
  DEFAULT_PREFERENCES,
  isPreferenceValue,
  type PartialPreferences,
  PREFERENCE_KEYS,
  type PreferenceKey,
  type SIMWPreferences,
} from './vocabulary';

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
  | 'native'
  | 'site-override'
  | 'passport'
  | 'site-default'
  | 'seed'
  | 'protocol-default';

export const PRECEDENCE: ReadonlyArray<{ layer: Layer; label: string; description: string }> = [
  {
    layer: 'native',
    label: 'Your device',
    description:
      'Accessibility, browser and operating-system settings. They decide what happens on this device, without changing what you saved.',
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

/** Everything an adaptive site needs to render, fully resolved: the *effective* experience. */
export interface Experience extends Omit<SIMWPreferences, 'colorScheme'> {
  /** `system` is resolved to what the device says. */
  colorScheme: ResolvedColorScheme;
  contrast: 'standard' | 'more' | 'less';
  /** `reduced` when the device asks for less transparency or forces its own colors. */
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
export type StatedSources = { [K in PreferenceKey]: Layer };

/**
 * A device or browser condition that changes *effective* behavior without
 * touching what the visitor stated. UIs use these to explain, in plain
 * language, why a saved choice isn't taking effect right now.
 */
export type ConstraintId =
  /** `prefers-reduced-motion: reduce`. Effective motion is at least `reduced`, so visual-motion media doesn't autoplay. */
  | 'os-reduced-motion'
  /** The Save-Data client hint. Heavy media isn't loaded or autoplayed automatically. */
  | 'save-data'
  /** `prefers-reduced-data: reduce`. Same effect as Save-Data. */
  | 'reduced-data'
  /** `forced-colors: active`. The device's colors win over any explicit theme; translucency and variation are off. */
  | 'forced-colors'
  /** `prefers-contrast: more`. Decorative variation is off. */
  | 'more-contrast';

export interface Constraint {
  id: ConstraintId;
  /**
   * Experience dimensions whose effective behavior this constraint can change.
   * For `autoplay` that means which media may start on its own; the autoplay
   * value itself is never rewritten.
   */
  affects: readonly ExperienceKey[];
  /** One plain-English sentence: what the device is asking for and what happens. */
  reason: string;
}

export const CONSTRAINTS: { readonly [K in ConstraintId]: Omit<Constraint, 'id'> } = {
  'os-reduced-motion': {
    affects: ['motion', 'autoplay'],
    reason:
      'Your device is asking for reduced motion, so animation stays calm and moving media waits for you.',
  },
  'save-data': {
    affects: ['data', 'autoplay'],
    reason: 'Your browser is asking to save data, so large media waits until you ask for it.',
  },
  'reduced-data': {
    affects: ['data', 'autoplay'],
    reason:
      'Your device is asking for reduced data use, so large media waits until you ask for it.',
  },
  'forced-colors': {
    affects: ['colorScheme', 'transparency', 'variant'],
    reason:
      'Your device is using forced colors, so its own colors win over any theme, and see-through effects and decorative variation are off.',
  },
  'more-contrast': {
    affects: ['variant'],
    reason: 'Your device is asking for more contrast, so decorative variation is off.',
  },
};

function constraint(id: ConstraintId): Constraint {
  return { id, ...CONSTRAINTS[id] };
}

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
  /**
   * What the visitor stated, after precedence (override → Passport → site
   * default → protocol default), with no device constraints applied. This
   * is what UIs show as the chosen value and what storage holds.
   */
  stated: SIMWPreferences;
  statedSources: StatedSources;
  /** The effective experience: stated preferences combined with current-device constraints. */
  experience: Experience;
  sources: ExperienceSources;
  /** Device constraints active right now, in a stable order. */
  constraints: Constraint[];
}

const LAYER_ORDER = ['site-override', 'passport', 'site-default'] as const;

/**
 * Resolves every layer in two steps.
 *
 * 1. **Stated preferences**: the first layer that says something wins. Device
 *    signals play no part, so a visitor can save "Full motion" on a device
 *    that currently asks for reduced motion.
 * 2. **Effective experience**: device constraints are applied on top. Native
 *    accessibility signals are floors that stated preferences can't loosen
 *    (OS reduced motion makes effective motion at least `reduced`), and hard
 *    requirements like forced colors win over explicit presentation choices.
 *    The device color scheme is a softer default: an explicit light or dark
 *    choice overrides it, because choosing dark for one site isn't an
 *    accessibility conflict.
 *
 * `autoplay` is never rewritten. Whether a particular piece of media may
 * start on its own depends on what kind of media it is (see
 * `autoplayMode` in @simw/adapters): reduced motion stops visual motion,
 * not sound, and saving data stops heavy downloads.
 */
export function resolveExperience(input: ResolveInput): Resolution {
  const { native } = input;
  const layers: Record<(typeof LAYER_ORDER)[number], PartialPreferences | null | undefined> = {
    'site-override': input.siteOverrides,
    passport: input.passport,
    'site-default': input.siteDefaults,
  };

  // 1. Stated preferences.
  const stated = { ...DEFAULT_PREFERENCES } as SIMWPreferences;
  const statedSources = {} as StatedSources;
  for (const key of PREFERENCE_KEYS) {
    statedSources[key] = 'protocol-default';
    for (const layer of LAYER_ORDER) {
      const value = layers[layer]?.[key];
      if (value !== undefined && isPreferenceValue(key, value)) {
        (stated as Record<PreferenceKey, string>)[key] = value;
        statedSources[key] = layer;
        break;
      }
    }
  }

  // 2. Device constraints.
  const reducedMotion = native['prefers-reduced-motion'] === 'reduce';
  const saveData = native['save-data'] === 'on';
  const reducedDataPref = native['prefers-reduced-data'] === 'reduce';
  const forcedColors = native['forced-colors'] === 'active';
  const contrastSignal = native['prefers-contrast'];
  const contrast: Experience['contrast'] =
    contrastSignal === 'more' || contrastSignal === 'less' ? contrastSignal : 'standard';

  const constraints: Constraint[] = [];
  if (reducedMotion) constraints.push(constraint('os-reduced-motion'));
  if (saveData) constraints.push(constraint('save-data'));
  if (reducedDataPref) constraints.push(constraint('reduced-data'));
  if (forcedColors) constraints.push(constraint('forced-colors'));
  if (contrast === 'more') constraints.push(constraint('more-contrast'));

  // Motion: the OS floor raises effective motion; stated motion is untouched.
  const motion = reducedMotion ? atLeast('motion', stated.motion, 'reduced') : stated.motion;
  const motionSource: Layer = motion !== stated.motion ? 'native' : statedSources.motion;

  // Color scheme: forced colors always follow the device (it derives
  // prefers-color-scheme from its Canvas color). Otherwise an explicit choice
  // wins over the device, and "system" follows it.
  const deviceScheme: ResolvedColorScheme =
    native['prefers-color-scheme'] === 'dark' ? 'dark' : 'light';
  let colorScheme: ResolvedColorScheme;
  let colorSource: Layer;
  if (forcedColors) {
    colorScheme = deviceScheme;
    colorSource = 'native';
  } else if (stated.colorScheme === 'system') {
    colorScheme = deviceScheme;
    colorSource = native['prefers-color-scheme'] ? 'native' : statedSources.colorScheme;
  } else {
    colorScheme = stated.colorScheme;
    colorSource = statedSources.colorScheme;
  }

  const transparency: Experience['transparency'] =
    native['prefers-reduced-transparency'] === 'reduce' || forcedColors ? 'reduced' : 'standard';
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

  const { colorScheme: _stated, ...rest } = stated;
  const experience: Experience = {
    ...rest,
    motion,
    colorScheme,
    contrast,
    transparency,
    forcedColors,
    data: saveData || reducedDataPref ? 'reduced' : 'standard',
    pointer,
    hover,
    variant,
  };

  const { colorScheme: _statedSource, ...restSources } = statedSources;
  const sources: ExperienceSources = {
    ...restSources,
    motion: motionSource,
    colorScheme: colorSource,
    contrast: 'native',
    transparency: 'native',
    forcedColors: 'native',
    data: 'native',
    pointer: 'native',
    hover: 'native',
    variant: variant === null && variationUnsafe && input.seed ? 'native' : 'seed',
  };

  return { stated, statedSources, experience, sources, constraints };
}

/** Active constraints that can change the effective value of `key`. */
export function constraintsAffecting(
  constraints: readonly Constraint[],
  key: ExperienceKey,
): Constraint[] {
  return constraints.filter((c) => c.affects.includes(key));
}

/** The experience a site renders when nothing at all is known (e.g. on the server). */
export const DEFAULT_EXPERIENCE: Experience = resolveExperience({ native: {} }).experience;
