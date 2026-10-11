/**
 * Shapes shared by the scanner Worker, the web app's /listen page and the
 * calibration tests. Facts are what a browser observed; a report is what we
 * conclude from them.
 */

/** The page loads the scanner compares. Each emulates one visitor preference. */
export type Variant = 'baseline' | 'reduced-motion' | 'dark' | 'more-contrast' | 'forced-colors';

/** Media features whose use the collector counts. */
export type MediaFeature =
  | 'prefers-reduced-motion'
  | 'prefers-color-scheme'
  | 'prefers-contrast'
  | 'forced-colors'
  | 'prefers-reduced-transparency';

export const MEDIA_FEATURES: readonly MediaFeature[] = [
  'prefers-reduced-motion',
  'prefers-color-scheme',
  'prefers-contrast',
  'forced-colors',
  'prefers-reduced-transparency',
];

export type FeatureCounts = Record<MediaFeature, number>;

export interface MediaFact {
  kind: 'video' | 'audio';
  /** The element's autoplay property after the page settled. */
  autoplay: boolean;
  /** Actually playing (not paused, not ended). */
  playing: boolean;
  muted: boolean;
  /** Rendered area in CSS px². 0 for hidden media. */
  area: number;
  /** At least partly inside the first viewport. */
  inFirstViewport: boolean;
}

/** What the in-page collector reports for one page load. */
export interface PageFacts {
  viewport: { width: number; height: number };
  /** `<meta name="viewport">` content, if any. */
  viewportMeta: string | null;
  /** `<meta name="color-scheme">` content, if any. */
  colorSchemeMeta: string | null;
  /** Computed `color-scheme` of the root element. */
  rootColorScheme: string;
  css: {
    /** Rules mentioning each feature, in stylesheets the page could read. */
    features: FeatureCounts;
    /** Style rules using `light-dark()`. */
    lightDark: number;
    readableSheets: number;
    /** Cross-origin sheets the page can't read; the driver scans their text instead. */
    unreadableHrefs: string[];
    /** `:hover` rules that reveal content, with no `:focus` / `:focus-within` / `:focus-visible` twin. */
    hoverRevealRules: number;
  };
  /** `matchMedia()` queries the page's scripts made, by feature. */
  queried: FeatureCounts;
  colors: {
    /** Effective page background (RGB 0–255). */
    background: [number, number, number];
    /** Body text color (RGB 0–255). */
    text: [number, number, number];
    /** Per-element color signatures, in document order, for comparing loads. */
    signature: string[];
  };
  animations: {
    running: number;
    /** Running animations that never end (`animation-iteration-count: infinite`, …). */
    infinite: number;
  };
  media: MediaFact[];
  carousel: {
    /** Elements that look like carousels or sliders. */
    candidates: number;
    /** Separate bursts of DOM or scroll changes inside them while we watched without interacting. */
    advances: number;
  };
}

export interface VariantFacts {
  variant: Variant;
  facts: PageFacts;
}

export interface ScanFacts {
  /** The normalized URL that was loaded. */
  url: string;
  /** Where the page ended up after redirects. */
  finalUrl: string;
  variants: Partial<Record<Variant, PageFacts>>;
  /** Media-feature mentions found in cross-origin stylesheet text, by feature. */
  externalCss: FeatureCounts;
  /** Stylesheets that couldn't be read at all. */
  unreadableSheets: number;
}

export type CheckStatus = 'pass' | 'partial' | 'fail';

export type CheckId =
  | 'reduced-motion-listens'
  | 'reduced-motion-animation'
  | 'reduced-motion-media'
  | 'carousel'
  | 'color-scheme'
  | 'contrast'
  | 'forced-colors'
  | 'hover'
  | 'viewport'
  | 'audio-autoplay';

export interface Check {
  id: CheckId;
  status: CheckStatus;
  /** The ✓ / △ / ✕ row: "Dark mode respected", "Hero video ignores motion preference", … */
  title: string;
  /** One or two plain sentences on what we saw. */
  detail: string;
  /** Points this check is worth in the score. */
  weight: number;
  /** Points earned: all for pass, half (rounded down) for partial, none for fail. */
  earned: number;
  /** A heuristic finding that may be wrong; the UI labels it "possible". */
  possible?: boolean;
}

export interface ReportView {
  variant: Variant;
  label: string;
}

export interface ScanReport {
  id: string;
  /** Normalized: origin and path only. Query strings and fragments are never kept. */
  url: string;
  /** ISO 8601. */
  scannedAt: string;
  /** ISO 8601: when the stored report is deleted. */
  expiresAt: string;
  /** Preference Awareness Score, 0–100. */
  score: number;
  rubricVersion: typeof RUBRIC_VERSION;
  /** Most important first. */
  checks: Check[];
  /** Emulated screenshots kept for a short while, if any. */
  views: ReportView[];
  /** ISO 8601: when the screenshots are deleted. */
  viewsExpireAt: string | null;
  notes: string[];
}

export const RUBRIC_VERSION = '1';
