import {
  type Check,
  type CheckId,
  type CheckStatus,
  type FeatureCounts,
  type MediaFeature,
  type PageFacts,
  type ReportView,
  RUBRIC_VERSION,
  type ScanFacts,
  type ScanReport,
} from './types';

/**
 * The Preference Awareness Score, rubric version 1.
 *
 * Deterministic: the same facts always give the same checks and score. Each
 * check is worth a fixed number of points (100 in total). A pass earns all of
 * them, a partial half (rounded down), a fail none. Thresholds are listed in
 * docs/scanner-rubric.md; change them only together with RUBRIC_VERSION.
 */
export const RUBRIC: Readonly<Record<CheckId, number>> = {
  'color-scheme': 20,
  contrast: 15,
  'reduced-motion-listens': 10,
  'reduced-motion-animation': 10,
  'reduced-motion-media': 8,
  carousel: 7,
  'forced-colors': 10,
  hover: 10,
  viewport: 5,
  'audio-autoplay': 5,
};

export const CHECK_ORDER = Object.keys(RUBRIC) as CheckId[];

/** Thresholds, named so the rubric doc and the code can't drift apart silently. */
export const THRESHOLDS = {
  /** Relative luminance above which a background reads as light. */
  lightBackground: 0.4,
  /** Relative luminance below which a background reads as dark. */
  darkBackground: 0.2,
  /** Share of sampled elements whose colors changed for "dark mode partially supported". */
  darkPartialChange: 0.25,
  /** Share of sampled elements whose colors changed for "contrast supported". */
  contrastChange: 0.02,
  /** Text/background contrast-ratio gain that also counts as "contrast supported". */
  contrastRatioGain: 0.5,
  /** Share of the viewport a first-screen video must cover to be called a hero video. */
  heroArea: 0.15,
} as const;

/** WCAG relative luminance of an sRGB color, 0 (black) to 1 (white). */
export function luminance([r, g, b]: readonly [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Share (0–1) of sampled elements whose color signature differs between two loads. */
export function signatureChange(a: readonly string[], b: readonly string[]): number {
  const length = Math.max(a.length, b.length);
  if (length === 0) return 0;
  let changed = 0;
  for (let i = 0; i < length; i++) if (a[i] !== b[i]) changed += 1;
  return changed / length;
}

function check(
  id: CheckId,
  status: CheckStatus,
  title: string,
  detail: string,
  possible = false,
): Check {
  const weight = RUBRIC[id];
  const earned = status === 'pass' ? weight : status === 'partial' ? Math.floor(weight / 2) : 0;
  return { id, status, title, detail, weight, earned, ...(possible ? { possible } : {}) };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Every way the page showed it listens for a feature: CSS rules (readable or fetched) and script queries. */
function signals(facts: ScanFacts, base: PageFacts, feature: MediaFeature): number {
  return base.css.features[feature] + facts.externalCss[feature] + base.queried[feature];
}

function cssRules(facts: ScanFacts, base: PageFacts, feature: MediaFeature): number {
  return base.css.features[feature] + facts.externalCss[feature];
}

export function analyze(facts: ScanFacts): { checks: Check[]; score: number } {
  const base = facts.variants.baseline;
  if (!base) throw new Error('A scan needs at least the baseline load.');
  const reduced = facts.variants['reduced-motion'] ?? base;
  const dark = facts.variants.dark ?? base;
  const contrast = facts.variants['more-contrast'] ?? base;
  const checks: Check[] = [];

  // Color scheme ------------------------------------------------------------------
  {
    const lightBase = luminance(base.colors.background);
    const lightDark = luminance(dark.colors.background);
    const change = signatureChange(base.colors.signature, dark.colors.signature);
    const declaresDark = /dark/.test(`${base.colorSchemeMeta ?? ''} ${base.rootColorScheme}`);
    const evidence =
      signals(facts, base, 'prefers-color-scheme') + base.css.lightDark + (declaresDark ? 1 : 0);
    if (lightBase > THRESHOLDS.lightBackground && lightDark < THRESHOLDS.darkBackground) {
      checks.push(
        check(
          'color-scheme',
          'pass',
          'Dark mode respected',
          'The page turns dark when the visitor’s device asks for dark mode.',
        ),
      );
    } else if (lightBase <= THRESHOLDS.darkBackground) {
      checks.push(
        check(
          'color-scheme',
          'partial',
          'Dark by default',
          'The page is dark even when the device asks for a light interface, so a light preference isn’t heard.',
        ),
      );
    } else if (change >= THRESHOLDS.darkPartialChange || evidence > 0) {
      checks.push(
        check(
          'color-scheme',
          'partial',
          'Dark mode partially supported',
          'The page reacts to a dark-mode request, but its main background stays light.',
        ),
      );
    } else {
      checks.push(
        check(
          'color-scheme',
          'fail',
          'Dark mode preference not supported',
          'Nothing changed when the device asked for dark mode.',
        ),
      );
    }
  }

  // Contrast ------------------------------------------------------------------------
  {
    const change = signatureChange(base.colors.signature, contrast.colors.signature);
    const gain =
      contrastRatio(contrast.colors.background, contrast.colors.text) -
      contrastRatio(base.colors.background, base.colors.text);
    const evidence = signals(facts, base, 'prefers-contrast');
    if (change >= THRESHOLDS.contrastChange || gain >= THRESHOLDS.contrastRatioGain) {
      checks.push(
        check(
          'contrast',
          'pass',
          'Contrast preference supported',
          'Colors strengthen when the device asks for more contrast.',
        ),
      );
    } else if (evidence > 0) {
      checks.push(
        check(
          'contrast',
          'partial',
          'Contrast preference partially supported',
          'The page checks for a contrast preference, but little changed on this page.',
        ),
      );
    } else {
      checks.push(
        check(
          'contrast',
          'fail',
          'Contrast preference not supported',
          'Nothing changed when the device asked for more contrast.',
        ),
      );
    }
  }

  // Reduced motion: listening -----------------------------------------------------------
  {
    const rules = cssRules(facts, base, 'prefers-reduced-motion');
    const scripts = base.queried['prefers-reduced-motion'];
    if (rules + scripts > 0) {
      const how = [rules > 0 ? plural(rules, 'CSS rule') : '', scripts > 0 ? 'its scripts' : '']
        .filter(Boolean)
        .join(' and ');
      checks.push(
        check(
          'reduced-motion-listens',
          'pass',
          'Listens for reduced motion',
          `The page checks for a reduced-motion preference (${how}).`,
        ),
      );
    } else {
      checks.push(
        check(
          'reduced-motion-listens',
          'fail',
          'Reduced motion preference not detected',
          'We found no prefers-reduced-motion rule in readable stylesheets, and no script asked for it.',
        ),
      );
    }
  }

  // Reduced motion: continuous animation --------------------------------------------------
  {
    const before = base.animations.infinite;
    const after = reduced.animations.infinite;
    if (before === 0 && after === 0) {
      checks.push(
        check(
          'reduced-motion-animation',
          'pass',
          'No continuous animation found',
          'Nothing on the page loops forever.',
        ),
      );
    } else if (after === 0) {
      checks.push(
        check(
          'reduced-motion-animation',
          'pass',
          'Animations calm down for reduced motion',
          `${plural(before, 'looping animation')} stopped when reduced motion was requested.`,
        ),
      );
    } else if (after < before) {
      checks.push(
        check(
          'reduced-motion-animation',
          'partial',
          'Reduced motion partially supported',
          `${plural(after, 'looping animation')} of ${before} kept running with reduced motion requested.`,
        ),
      );
    } else {
      checks.push(
        check(
          'reduced-motion-animation',
          'fail',
          'Animations ignore motion preference',
          `${plural(after, 'looping animation')} kept running with reduced motion requested.`,
        ),
      );
    }
  }

  // Reduced motion: video ------------------------------------------------------------------
  {
    const viewportArea = base.viewport.width * base.viewport.height;
    const moving = (p: PageFacts) =>
      p.media.filter((m) => m.kind === 'video' && m.area > 0 && (m.autoplay || m.playing));
    const stillMoving = moving(reduced);
    if (stillMoving.length > 0) {
      const hero = stillMoving.some(
        (m) => m.inFirstViewport && m.area >= THRESHOLDS.heroArea * viewportArea,
      );
      checks.push(
        check(
          'reduced-motion-media',
          'fail',
          hero ? 'Hero video ignores motion preference' : 'Video ignores motion preference',
          `${plural(stillMoving.length, 'video')} still set to play on its own with reduced motion requested.`,
        ),
      );
    } else if (moving(base).length > 0) {
      checks.push(
        check(
          'reduced-motion-media',
          'pass',
          'Video waits for reduced-motion visitors',
          'Autoplaying video stops when reduced motion is requested.',
        ),
      );
    } else {
      checks.push(
        check(
          'reduced-motion-media',
          'pass',
          'No autoplaying video found',
          'No video starts on its own.',
        ),
      );
    }
  }
  if (reduced.carousel.advances > 0) {
    checks.push(
      check(
        'carousel',
        'fail',
        'Carousel automatically advances',
        'A carousel moved on its own while we watched, even with reduced motion requested.',
      ),
    );
  } else if (base.carousel.advances > 0) {
    checks.push(
      check(
        'carousel',
        'pass',
        'Carousel waits for reduced-motion visitors',
        'The carousel advances on its own, but not when reduced motion is requested.',
      ),
    );
  } else {
    checks.push(
      check(
        'carousel',
        'pass',
        'No auto-advancing carousel found',
        'Nothing on the page slid on its own while we watched.',
      ),
    );
  }

  // Forced colors ----------------------------------------------------------------------------
  {
    const evidence = signals(facts, base, 'forced-colors');
    checks.push(
      evidence > 0
        ? check(
            'forced-colors',
            'pass',
            'Forced colors handled',
            'The page adjusts itself when the device forces its own colors.',
          )
        : check(
            'forced-colors',
            'partial',
            'No forced-colors adjustments found',
            'Browsers apply forced colors automatically, but icons, focus outlines and custom controls can disappear. Worth checking by hand.',
          ),
    );
  }

  // Hover dependence ----------------------------------------------------------------------------
  {
    const rules = base.css.hoverRevealRules;
    checks.push(
      rules > 0
        ? check(
            'hover',
            'partial',
            'Possible hover-only content',
            `${plural(rules, 'CSS rule')} reveal content on hover with no keyboard or touch equivalent we could find.`,
            true,
          )
        : check(
            'hover',
            'pass',
            'No hover-only content found',
            'Nothing we could see is hidden behind hover alone.',
          ),
    );
  }

  // Responsive viewport ---------------------------------------------------------------------------
  checks.push(
    /width\s*=\s*device-width/i.test(base.viewportMeta ?? '')
      ? check(
          'viewport',
          'pass',
          'Touch layout responsive',
          'The page sets a responsive viewport for phones and tablets.',
        )
      : check(
          'viewport',
          'fail',
          'No responsive viewport set',
          'Without a viewport meta tag, phones show a zoomed-out desktop page.',
        ),
  );

  // Sound -----------------------------------------------------------------------------------------
  {
    const audible = base.media.filter((m) => (m.autoplay || m.playing) && !m.muted);
    checks.push(
      audible.length > 0
        ? check(
            'audio-autoplay',
            'partial',
            'Sound may start on its own',
            `${plural(audible.length, 'media element')} set to autoplay with sound on.`,
          )
        : check(
            'audio-autoplay',
            'pass',
            'No sound starts on its own',
            'Nothing plays sound without being asked.',
          ),
    );
  }

  checks.sort((a, b) => CHECK_ORDER.indexOf(a.id) - CHECK_ORDER.indexOf(b.id));
  const score = checks.reduce((sum, c) => sum + c.earned, 0);
  return { checks, score };
}

export interface ReportMeta {
  id: string;
  scannedAt: Date;
  expiresAt: Date;
  views: ReportView[];
  viewsExpireAt: Date | null;
  /** True when the submitted address had a query string or fragment we removed. */
  stripped?: { query: boolean; fragment: boolean };
}

export function buildReport(facts: ScanFacts, meta: ReportMeta): ScanReport {
  const { checks, score } = analyze(facts);
  const notes: string[] = [
    'We loaded one public page five ways (no preference, reduced motion, dark mode, more contrast, forced colors) and compared them. This is a limited automated check, not an accessibility audit.',
  ];
  if (meta.stripped?.query || meta.stripped?.fragment) {
    notes.push('We removed the query string and fragment from the address before loading it.');
  }
  if (facts.unreadableSheets > 0) {
    notes.push(
      `${plural(facts.unreadableSheets, 'stylesheet')} couldn’t be read, so some support may have been missed.`,
    );
  }
  return {
    id: meta.id,
    url: facts.url,
    scannedAt: meta.scannedAt.toISOString(),
    expiresAt: meta.expiresAt.toISOString(),
    score,
    rubricVersion: RUBRIC_VERSION,
    checks,
    views: meta.views,
    viewsExpireAt: meta.viewsExpireAt?.toISOString() ?? null,
    notes,
  };
}

/** For tests and fixtures: an all-zero count record. */
export function zeroCounts(): FeatureCounts {
  return {
    'prefers-reduced-motion': 0,
    'prefers-color-scheme': 0,
    'prefers-contrast': 0,
    'forced-colors': 0,
    'prefers-reduced-transparency': 0,
  };
}
