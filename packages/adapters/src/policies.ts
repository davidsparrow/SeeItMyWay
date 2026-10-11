import type { Experience } from '@simw/protocol';

/**
 * Small, explicit decisions components can make from an Experience. Keeping
 * them here means every adaptive component answers the same question the
 * same way.
 */

/** Ambient, non-essential motion: drifting stars, looping backgrounds, entrance flourishes. */
export function allowsDecorativeMotion(exp: Experience): boolean {
  return exp.motion === 'full';
}

export function allowsParallax(exp: Experience): boolean {
  return exp.motion === 'full';
}

/** How state changes should animate. */
export function transitionStyle(exp: Experience): 'slide' | 'fade' | 'none' {
  if (exp.motion === 'full') return 'slide';
  if (exp.motion === 'reduced') return 'fade';
  return 'none';
}

/** Carousels and slideshows may move on their own only with full motion and autoplay allowed. */
export function allowsAutoAdvance(exp: Experience): boolean {
  return exp.motion === 'full' && exp.autoplay === 'allowed';
}

export type AutoplayMode = 'play' | 'play-muted' | 'off';

/** Minimal motion means nothing moves unless the visitor asks, so it also stops autoplay. */
export function autoplayMode(exp: Experience): AutoplayMode {
  if (exp.autoplay === 'never' || exp.motion === 'minimal') return 'off';
  if (exp.autoplay === 'muted') return 'play-muted';
  return 'play';
}

export function showCaptions(exp: Experience, siteDefault = false): boolean {
  if (exp.captions === 'always' || exp.captions === 'prefer') return true;
  return siteDefault;
}

/** Grid columns, adjusted for density. Never fewer than one. */
export function columnsFor(exp: Experience, base: number): number {
  if (exp.density === 'compact') return base + 1;
  if (exp.density === 'roomy') return Math.max(1, base - 1);
  return base;
}

/** Glass, blur and see-through surfaces. */
export function allowsTranslucency(exp: Experience): boolean {
  return exp.transparency !== 'reduced' && !exp.forcedColors && exp.contrast !== 'more';
}

/** Decorative imagery and atmosphere. */
export function showsDecoration(exp: Experience): boolean {
  return exp.visualRichness !== 'minimal';
}

/** Large optional downloads (video, high-res imagery) load only on request when data is reduced. */
export function loadsHeavyMediaAutomatically(exp: Experience): boolean {
  return exp.data !== 'reduced';
}

/**
 * Whether extra information may hide behind hover. On touch screens or
 * without a hover-capable pointer it must be visible or tappable instead.
 */
export function revealsOnHover(exp: Experience): boolean {
  return exp.hover && exp.pointer === 'fine';
}
