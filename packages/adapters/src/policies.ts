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

/** What a piece of media is, so autoplay decisions can tell visual motion from sound. */
export interface MediaTraits {
  /** It moves on screen: video, an animated hero, a timelapse, a slideshow. Audio-only media doesn't. */
  visualMotion: boolean;
  /** The motion carries meaning the visitor needs. Rare for autoplaying media; reduced motion doesn't stop it. */
  essential?: boolean;
  /** A large download. Defaults to true; pass false for small clips and pure UI motion. */
  heavy?: boolean;
}

export type AutoplayMode = 'play' | 'play-muted' | 'off';

/**
 * Whether this media may start on its own, from the *effective* experience.
 *
 * - The visitor's autoplay preference is the ceiling: `never` stops
 *   everything, `muted` allows muted visual media only.
 * - Reduced or minimal effective motion stops non-essential visual motion,
 *   but not audio-only media. The stated autoplay preference is unchanged.
 * - Reduced data (Save-Data, `prefers-reduced-data`) stops heavy media,
 *   which then loads only on request.
 */
export function autoplayMode(exp: Experience, media: MediaTraits): AutoplayMode {
  if (exp.autoplay === 'never') return 'off';
  if (media.visualMotion && !media.essential && exp.motion !== 'full') return 'off';
  if ((media.heavy ?? true) && !loadsHeavyMediaAutomatically(exp)) return 'off';
  if (exp.autoplay === 'muted') return media.visualMotion ? 'play-muted' : 'off';
  return 'play';
}

/** Carousels and slideshows: light visual motion that may advance on its own only when autoplay fully allows it. */
export function allowsAutoAdvance(exp: Experience): boolean {
  return autoplayMode(exp, { visualMotion: true, heavy: false }) === 'play';
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
