import { DEFAULT_EXPERIENCE, type Experience } from '@simw/protocol';

/**
 * The adaptive contract between SeeItMyWay and a website's CSS.
 *
 * Sites style against `data-simw-*` attributes and `--simw-*` custom
 * properties rather than raw media queries. The same stylesheet then works
 * for native signals, Passport preferences, local Tune settings and preview
 * simulations, because all of them resolve to one Experience first.
 */

const MOTION_SCALE = { full: '1', reduced: '0.4', minimal: '0' } as const;
const DURATION = { full: '240ms', reduced: '160ms', minimal: '0ms' } as const;
const DENSITY_STEP = { compact: '-1', standard: '0', roomy: '1' } as const;
const SPACING_SCALE = { compact: '0.8', standard: '1', roomy: '1.3' } as const;
const FONT_SCALE = { standard: '1', larger: '1.125', largest: '1.25' } as const;
const MEASURE = { compact: '75ch', standard: '68ch', roomy: '60ch' } as const;
const CONTRAST_STEP = { less: '-1', standard: '0', more: '1' } as const;
const RICHNESS_STEP = { minimal: '0', standard: '1', rich: '2' } as const;

/** Minimum interactive target size in px. */
export function targetSize(exp: Experience): number {
  if (exp.controls === 'larger') return 56;
  if (exp.pointer === 'coarse') return 48;
  return 36;
}

export type SimwAttributes = Record<`data-simw-${string}`, string>;

export function experienceToAttributes(exp: Experience): SimwAttributes {
  return {
    'data-simw-color-scheme': exp.colorScheme,
    'data-simw-motion': exp.motion,
    'data-simw-density': exp.density,
    'data-simw-text-size': exp.textSize,
    'data-simw-navigation': exp.navigation,
    'data-simw-autoplay': exp.autoplay,
    'data-simw-detail': exp.detail,
    'data-simw-visual-richness': exp.visualRichness,
    'data-simw-instructions': exp.instructions,
    'data-simw-captions': exp.captions,
    'data-simw-controls': exp.controls,
    'data-simw-contrast': exp.contrast,
    'data-simw-transparency': exp.transparency,
    'data-simw-forced-colors': exp.forcedColors ? 'active' : 'none',
    'data-simw-data': exp.data,
    'data-simw-pointer': exp.pointer,
    'data-simw-hover': exp.hover ? 'hover' : 'none',
    'data-simw-variant': exp.variant === null ? 'none' : String(exp.variant),
  };
}

export const SIMW_ATTRIBUTE_NAMES = Object.keys(experienceToAttributes(DEFAULT_EXPERIENCE));

export type SimwTokens = Record<`--simw-${string}`, string>;

export function experienceToTokens(exp: Experience): SimwTokens {
  return {
    '--simw-motion-scale': MOTION_SCALE[exp.motion],
    '--simw-duration': DURATION[exp.motion],
    '--simw-density': DENSITY_STEP[exp.density],
    '--simw-spacing-scale': SPACING_SCALE[exp.density],
    '--simw-font-scale': FONT_SCALE[exp.textSize],
    '--simw-measure': MEASURE[exp.density],
    '--simw-contrast': CONTRAST_STEP[exp.contrast],
    '--simw-visual-richness': RICHNESS_STEP[exp.visualRichness],
    '--simw-target-size': `${targetSize(exp)}px`,
    '--simw-translucency': exp.transparency === 'reduced' ? '0' : '1',
  };
}

export const SIMW_TOKEN_NAMES = Object.keys(experienceToTokens(DEFAULT_EXPERIENCE));

/** Attributes plus tokens as a style object, handy for frameworks (`{...simwProps(exp)}`). */
export function experienceToProps(exp: Experience): SimwAttributes & {
  style: SimwTokens & { colorScheme: string };
} {
  return {
    ...experienceToAttributes(exp),
    style: { ...experienceToTokens(exp), colorScheme: exp.colorScheme },
  };
}

/** Writes the experience onto an element (usually `<html>`). Idempotent. */
export function applyExperience(el: HTMLElement, exp: Experience): void {
  for (const [name, value] of Object.entries(experienceToAttributes(exp))) {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }
  for (const [name, value] of Object.entries(experienceToTokens(exp))) {
    el.style.setProperty(name, value);
  }
  el.style.colorScheme = exp.colorScheme;
}

export function clearExperience(el: HTMLElement): void {
  for (const name of SIMW_ATTRIBUTE_NAMES) el.removeAttribute(name);
  for (const name of SIMW_TOKEN_NAMES) el.style.removeProperty(name);
  el.style.removeProperty('color-scheme');
}
