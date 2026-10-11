import type { Experience } from '@simw/protocol';
import { autoplayMode, type MediaTraits } from './policies';

/**
 * Level 1 "automatic / safe" adaptations (PRD §8) for existing websites.
 *
 * They only ever remove or calm things (animation, autoplay) or enlarge
 * tiny targets, they key off the `data-simw-*` attributes on `<html>`, and
 * every one fails closed: if an adapter throws, it uninstalls itself and the
 * original website wins.
 *
 * Opt-outs: put `data-simw-essential-motion` on motion that conveys meaning,
 * and `data-simw-ignore` on media SeeItMyWay should leave alone.
 */

export type SafeAdapterName = 'motion' | 'autoplay' | 'touch-targets';

export const DEFAULT_SAFE_ADAPTERS: readonly SafeAdapterName[] = ['motion', 'autoplay'];

interface InstalledAdapter {
  update(exp: Experience): void;
  uninstall(): void;
}

type AdapterFactory = (doc: Document, exp: Experience) => InstalledAdapter;

const ESSENTIAL = '[data-simw-essential-motion], [data-simw-essential-motion] *';

function scoped(state: string, decls: string): string {
  const base = `:root[data-simw-motion="${state}"] *:not(${ESSENTIAL})`;
  return `${base}, ${base}::before, ${base}::after { ${decls} }`;
}

export const MOTION_CSS = [
  `:root[data-simw-motion="reduced"], :root[data-simw-motion="minimal"] { scroll-behavior: auto !important; }`,
  scoped(
    'reduced',
    'scroll-behavior: auto !important; background-attachment: scroll !important; animation-iteration-count: 1 !important;',
  ),
  scoped(
    'minimal',
    'animation-duration: 0.01ms !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; transition-delay: 0s !important; scroll-behavior: auto !important; background-attachment: scroll !important;',
  ),
].join('\n');

const TARGET_SELECTOR =
  'button, [role="button"], select, summary, input:is([type="text"], [type="email"], [type="search"], [type="tel"], [type="url"], [type="password"], [type="number"], [type="submit"], [type="button"])';

export const TOUCH_TARGET_CSS = `:root:is([data-simw-pointer="coarse"], [data-simw-controls="larger"]) :is(${TARGET_SELECTOR}) { min-height: var(--simw-target-size, 48px); }`;

function styleAdapter(name: string, css: string): AdapterFactory {
  return (doc) => {
    const style = doc.createElement('style');
    style.setAttribute('data-simw-adapter', name);
    style.textContent = css;
    (doc.head ?? doc.documentElement).appendChild(style);
    return {
      update() {},
      uninstall() {
        style.remove();
      },
    };
  };
}

/** `<video>` is visual motion; `<audio>` is sound only. `data-simw-essential-motion` marks meaningful motion. */
function traitsOf(media: HTMLMediaElement): MediaTraits {
  if (!(media instanceof HTMLVideoElement)) return { visualMotion: false };
  return { visualMotion: true, essential: media.closest('[data-simw-essential-motion]') !== null };
}

function applyAutoplay(media: HTMLMediaElement, exp: Experience): void {
  if (media.closest('[data-simw-ignore]')) return;
  const originallyAutoplay = media.autoplay || media.dataset.simwAutoplay === 'original';
  if (!originallyAutoplay) return;
  media.dataset.simwAutoplay = 'original';

  const mode = autoplayMode(exp, traitsOf(media));
  if (mode === 'play') {
    media.autoplay = true;
    return;
  }
  if (mode === 'play-muted') {
    media.autoplay = true;
    media.muted = true;
    return;
  }
  // Off: stop it and hand control to the visitor.
  media.autoplay = false;
  media.controls = true;
  try {
    media.pause();
  } catch {
    // Some environments don't implement media playback; nothing to pause.
  }
}

/** The parts of an Experience that can change an autoplay decision. */
const autoplayKey = (exp: Experience) => `${exp.autoplay}|${exp.motion}|${exp.data}`;

const autoplayAdapter: AdapterFactory = (doc, initial) => {
  let exp = initial;
  const applyAll = (root: ParentNode) => {
    for (const m of root.querySelectorAll<HTMLMediaElement>('video, audio')) applyAutoplay(m, exp);
  };
  applyAll(doc);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLMediaElement) applyAutoplay(node, exp);
        else if (node instanceof Element) applyAll(node);
      }
    }
  });
  observer.observe(doc.documentElement, { childList: true, subtree: true });

  return {
    update(next) {
      const changed = autoplayKey(next) !== autoplayKey(exp);
      exp = next;
      if (changed) applyAll(doc);
    },
    uninstall() {
      observer.disconnect();
    },
  };
};

const FACTORIES: Record<SafeAdapterName, AdapterFactory> = {
  motion: styleAdapter('motion', MOTION_CSS),
  autoplay: autoplayAdapter,
  'touch-targets': styleAdapter('touch-targets', TOUCH_TARGET_CSS),
};

export interface SafeAdapters {
  update(exp: Experience): void;
  uninstall(): void;
  readonly active: readonly SafeAdapterName[];
}

export function installSafeAdapters(
  doc: Document,
  exp: Experience,
  names: readonly SafeAdapterName[] = DEFAULT_SAFE_ADAPTERS,
  onError: (name: SafeAdapterName, error: unknown) => void = () => {},
): SafeAdapters {
  const installed = new Map<SafeAdapterName, InstalledAdapter>();

  const failClosed = (name: SafeAdapterName, error: unknown) => {
    try {
      installed.get(name)?.uninstall();
    } catch {
      // Already broken; the important part is that it's gone.
    }
    installed.delete(name);
    onError(name, error);
  };

  for (const name of names) {
    try {
      installed.set(name, FACTORIES[name](doc, exp));
    } catch (error) {
      failClosed(name, error);
    }
  }

  return {
    update(next) {
      for (const [name, adapter] of [...installed]) {
        try {
          adapter.update(next);
        } catch (error) {
          failClosed(name, error);
        }
      }
    },
    uninstall() {
      for (const [name, adapter] of [...installed]) {
        try {
          adapter.uninstall();
        } catch (error) {
          onError(name, error);
        }
      }
      installed.clear();
    },
    get active() {
      return [...installed.keys()];
    },
  };
}
