import type { FeatureCounts, MediaFact, PageFacts } from './types';

/**
 * Code that runs inside the scanned page.
 *
 * Both functions are serialized by Playwright (`fn.toString()`) and evaluated
 * in the page, so they must be fully self-contained: no imports, no references
 * to anything outside their own bodies, and nothing a bundler might rewrite
 * into a helper call (the scanner Worker sets `keep_names: false` for this).
 * Types are compile-time only.
 */

export interface CollectOptions {
  /** How long to watch carousel candidates for movement, in ms. 0 skips it. */
  observeMs: number;
  /** Elements to fingerprint for color comparisons. */
  sampleSize: number;
}

/**
 * Installed before any page script runs: records which media features the
 * page's own scripts ask `matchMedia()` about, so JS-driven support (like the
 * SeeItMyWay SDK) counts as listening.
 */
export function recordMatchMediaQueries(): void {
  const w = window as unknown as {
    __simwQueried?: string[];
    matchMedia: (query: string) => MediaQueryList;
  };
  if (w.__simwQueried) return;
  const queried: string[] = [];
  w.__simwQueried = queried;
  const original = w.matchMedia.bind(window);
  w.matchMedia = (query: string) => {
    try {
      if (queried.length < 500) queried.push(String(query));
    } catch {
      // Recording must never break the page.
    }
    return original(query);
  };
}

export async function collectPageFacts(options: CollectOptions): Promise<PageFacts> {
  const FEATURES = [
    'prefers-reduced-motion',
    'prefers-color-scheme',
    'prefers-contrast',
    'forced-colors',
    'prefers-reduced-transparency',
  ] as const;
  const emptyCounts = (): FeatureCounts => ({
    'prefers-reduced-motion': 0,
    'prefers-color-scheme': 0,
    'prefers-contrast': 0,
    'forced-colors': 0,
    'prefers-reduced-transparency': 0,
  });
  const countFeatures = (text: string, into: FeatureCounts) => {
    for (const feature of FEATURES) {
      if (text.includes(feature)) into[feature] += 1;
    }
  };

  // --- Stylesheets: media features, light-dark(), hover-only reveals ---------
  const features = emptyCounts();
  let lightDark = 0;
  let readableSheets = 0;
  const unreadableHrefs: string[] = [];
  const hoverRules: Array<{ selector: string }> = [];
  const focusSelectors = new Set<string>();

  const revealsContent = (style: CSSStyleDeclaration) =>
    (style.display !== '' && style.display !== 'none') ||
    style.visibility === 'visible' ||
    style.opacity === '1' ||
    (style.maxHeight !== '' && style.maxHeight !== '0px' && style.maxHeight !== '0');

  const walk = (rules: CSSRuleList, hoverGuarded: boolean) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        const condition = rule.media.mediaText;
        countFeatures(condition, features);
        walk(rule.cssRules, hoverGuarded || /\(\s*(any-)?hover\s*:\s*hover\s*\)/.test(condition));
      } else if (rule instanceof CSSImportRule) {
        countFeatures(rule.media.mediaText, features);
        try {
          if (rule.styleSheet) walk(rule.styleSheet.cssRules, hoverGuarded);
        } catch {
          // Cross-origin import: counted by the driver from the response text.
        }
      } else if (rule instanceof CSSStyleRule) {
        if (rule.cssText.includes('light-dark(')) lightDark += 1;
        const selectors = rule.selectorText.split(',').map((s) => s.trim());
        for (const selector of selectors) {
          if (/:focus(-within|-visible)?\b/.test(selector)) {
            focusSelectors.add(selector.replace(/:focus(-within|-visible)?\b/g, ':hover'));
          }
          // The classic hover-only reveal: hovering one element shows another
          // (`.card:hover .overlay`, `li:hover > ul`), outside an (hover: hover) guard.
          if (
            !hoverGuarded &&
            /:hover[^\s,>+~]*\s*[\s>+~]\s*[^\s]/.test(selector) &&
            revealsContent(rule.style)
          ) {
            hoverRules.push({ selector });
          }
        }
        if ('cssRules' in rule && (rule as CSSStyleRule & { cssRules?: CSSRuleList }).cssRules) {
          walk((rule as CSSStyleRule & { cssRules: CSSRuleList }).cssRules, hoverGuarded);
        }
      } else if ('cssRules' in rule) {
        // @supports, @layer, @container and other grouping rules.
        walk((rule as CSSGroupingRule).cssRules, hoverGuarded);
      }
    }
  };

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules, false);
      readableSheets += 1;
    } catch {
      if (sheet.href) unreadableHrefs.push(sheet.href);
    }
  }
  for (const sheet of document.adoptedStyleSheets ?? []) {
    try {
      walk(sheet.cssRules, false);
      readableSheets += 1;
    } catch {
      // Ignore.
    }
  }
  const hoverRevealRules = hoverRules.filter((r) => !focusSelectors.has(r.selector)).length;

  // --- matchMedia queries recorded by the init script -------------------------
  const queried = emptyCounts();
  const recorded = (window as unknown as { __simwQueried?: string[] }).__simwQueried ?? [];
  for (const query of recorded) countFeatures(query, queried);

  // --- Colors ----------------------------------------------------------------
  const parseColor = (value: string): [number, number, number, number] => {
    const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?/.exec(value);
    if (!m) return [0, 0, 0, 0];
    const alpha =
      m[4] === undefined ? 1 : m[4].endsWith('%') ? Number.parseFloat(m[4]) / 100 : Number(m[4]);
    return [Number(m[1]), Number(m[2]), Number(m[3]), alpha];
  };
  const rootStyle = getComputedStyle(document.documentElement);
  const rootColorScheme = rootStyle.colorScheme || 'normal';
  const canvasDark =
    window.matchMedia('(prefers-color-scheme: dark)').matches && /dark/.test(rootColorScheme);
  const canvas: [number, number, number] = canvasDark ? [18, 18, 18] : [255, 255, 255];
  const background = (() => {
    for (const el of [document.body, document.documentElement]) {
      if (!el) continue;
      const [r, g, b, a] = parseColor(getComputedStyle(el).backgroundColor);
      if (a > 0.5) return [r, g, b] as [number, number, number];
    }
    return canvas;
  })();
  const bodyColor = parseColor(getComputedStyle(document.body ?? document.documentElement).color);
  const text: [number, number, number] = [bodyColor[0], bodyColor[1], bodyColor[2]];

  const signature: string[] = [];
  for (const el of Array.from(document.body?.querySelectorAll('*') ?? [])) {
    if (signature.length >= options.sampleSize) break;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    const style = getComputedStyle(el);
    signature.push(`${el.tagName}|${style.color}|${style.backgroundColor}|${style.borderTopColor}`);
  }

  // --- Animations --------------------------------------------------------------
  let running = 0;
  let infinite = 0;
  if (typeof document.getAnimations === 'function') {
    for (const animation of document.getAnimations()) {
      if (animation.playState !== 'running') continue;
      running += 1;
      const timing = animation.effect?.getComputedTiming();
      if (timing && timing.iterations === Number.POSITIVE_INFINITY) infinite += 1;
    }
  }

  // --- Media -------------------------------------------------------------------
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const media: MediaFact[] = Array.from(document.querySelectorAll('video, audio')).map((el) => {
    const m = el as HTMLMediaElement;
    const box = m.getBoundingClientRect();
    const visible = getComputedStyle(m).visibility !== 'hidden';
    return {
      kind: m instanceof HTMLVideoElement ? 'video' : 'audio',
      autoplay: m.autoplay,
      playing: !m.paused && !m.ended,
      muted: m.muted,
      area: visible ? Math.round(box.width * box.height) : 0,
      inFirstViewport: box.bottom > 0 && box.top < vh && box.right > 0 && box.left < vw,
    };
  });

  // --- Carousels: watch for movement nobody asked for ------------------------------
  const candidates = Array.from(
    document.querySelectorAll(
      '[aria-roledescription="carousel" i], [class*="carousel" i], [class*="slider" i], [class*="swiper" i], [class*="slick" i], [class*="glide" i], [class*="splide" i], [data-carousel]',
    ),
  ).filter((el) => {
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  });
  let advances = 0;
  if (options.observeMs > 0 && candidates.length > 0) {
    const scrollStart = candidates.map((el) => el.scrollLeft);
    let lastChange = -Infinity;
    const observer = new MutationObserver(() => {
      const now = performance.now();
      if (now - lastChange > 400) advances += 1;
      lastChange = now;
    });
    for (const el of candidates) {
      observer.observe(el, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'aria-hidden', 'aria-current', 'data-active', 'hidden'],
      });
    }
    await new Promise((resolve) => setTimeout(resolve, options.observeMs));
    observer.disconnect();
    candidates.forEach((el, i) => {
      if (Math.abs(el.scrollLeft - (scrollStart[i] ?? 0)) > 2) advances += 1;
    });
  }

  const meta = (name: string) =>
    document.querySelector(`meta[name="${name}" i]`)?.getAttribute('content') ?? null;

  return {
    viewport: { width: vw, height: vh },
    viewportMeta: meta('viewport'),
    colorSchemeMeta: meta('color-scheme'),
    rootColorScheme,
    css: { features, lightDark, readableSheets, unreadableHrefs, hoverRevealRules },
    queried,
    colors: { background, text, signature },
    animations: { running, infinite },
    media,
    carousel: { candidates: candidates.length, advances },
  };
}
