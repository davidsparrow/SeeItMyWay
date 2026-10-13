import { type CollectOptions, collectPageFacts, recordMatchMediaQueries } from './collector';
import {
  type FeatureCounts,
  MEDIA_FEATURES,
  type PageFacts,
  type ScanFacts,
  type Variant,
} from './types';
import { requestRejection } from './url';

/**
 * Drives one scan: the same page loaded once per variant, each in a fresh
 * browser context (no cookies, no storage, no service workers) with one
 * visitor preference emulated from the first paint.
 *
 * Written against the small slice of the Playwright API it uses, so the
 * Worker can pass a Browser Run browser (`@cloudflare/playwright`) and the
 * calibration tests a local Chromium (`@playwright/test`).
 */

type Media = {
  colorScheme: 'light' | 'dark';
  reducedMotion: 'reduce' | 'no-preference';
  contrast: 'more' | 'no-preference';
  forcedColors: 'active' | 'none';
};

const BASE_MEDIA: Media = {
  colorScheme: 'light',
  reducedMotion: 'no-preference',
  contrast: 'no-preference',
  forcedColors: 'none',
};

export const VARIANTS: Record<Variant, { label: string; media: Media }> = {
  baseline: { label: 'No preferences expressed', media: BASE_MEDIA },
  'reduced-motion': {
    label: 'Asks for reduced motion',
    media: { ...BASE_MEDIA, reducedMotion: 'reduce' },
  },
  dark: { label: 'Asks for dark mode', media: { ...BASE_MEDIA, colorScheme: 'dark' } },
  'more-contrast': { label: 'Asks for more contrast', media: { ...BASE_MEDIA, contrast: 'more' } },
  'forced-colors': {
    label: 'Uses forced colors',
    media: { ...BASE_MEDIA, forcedColors: 'active' },
  },
};

export const VARIANT_ORDER: readonly Variant[] = [
  'baseline',
  'reduced-motion',
  'dark',
  'more-contrast',
  'forced-colors',
];

/** Variants where we watch carousels for movement (it costs `observeMs`). */
const OBSERVED: ReadonlySet<Variant> = new Set(['baseline', 'reduced-motion']);

export interface ResponseLike {
  url(): string;
  headers(): Record<string, string>;
  request(): { resourceType(): string };
  text(): Promise<string>;
}

export interface RouteLike {
  request(): { url(): string };
  continue(): Promise<void>;
  abort(errorCode?: string): Promise<void>;
}

export interface PageLike {
  goto(
    url: string,
    options: { waitUntil: 'domcontentloaded'; timeout: number },
  ): Promise<{ status(): number } | null>;
  waitForLoadState(state: 'load', options: { timeout: number }): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  url(): string;
  evaluate<R, A>(fn: (arg: A) => R | Promise<R>, arg: A): Promise<R>;
  screenshot(options: { type: 'jpeg'; quality: number }): Promise<Uint8Array>;
  on(event: 'response', listener: (response: ResponseLike) => void): unknown;
}

export interface ContextLike {
  addInitScript(script: () => void): Promise<void>;
  route(pattern: string, handler: (route: RouteLike) => Promise<void>): Promise<void>;
  newPage(): Promise<PageLike>;
  close(): Promise<void>;
}

export interface ContextOptions extends Media {
  viewport: { width: number; height: number };
  userAgent?: string;
  serviceWorkers: 'block';
  acceptDownloads: false;
}

export interface BrowserLike {
  newContext(options: ContextOptions): Promise<ContextLike>;
}

export interface ScanOptions {
  viewport?: { width: number; height: number };
  /** An honest user agent that says what we are. */
  userAgent?: string;
  /** Per page load, until DOMContentLoaded. */
  navigationTimeoutMs?: number;
  /** Extra wait for the `load` event; a slow page is scanned as far as it got. */
  loadTimeoutMs?: number;
  /** Quiet time after loading before collecting. */
  settleMs?: number;
  /** How long to watch carousels without interacting. */
  observeMs?: number;
  sampleSize?: number;
  /** Requests per page load before the rest are blocked. */
  maxRequests?: number;
  /** Bytes per page load (by Content-Length) before the rest are blocked. */
  maxBytes?: number;
  screenshots?: boolean;
  /** Which requests the page may make. Defaults to the URL guards in ./url. */
  allowRequest?: (url: string) => boolean;
  onProgress?: (variant: Variant, done: number, total: number) => void;
}

export type ScanErrorCode = 'navigation-failed' | 'http-status' | 'redirect-blocked';

export class ScanError extends Error {
  constructor(
    readonly code: ScanErrorCode,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ScanError';
  }
}

export interface ScanRun {
  facts: ScanFacts;
  screenshots: Partial<Record<Variant, Uint8Array>>;
}

const MAX_CSS_TEXT = 2 * 1024 * 1024;

export function countFeatureMentions(text: string): FeatureCounts {
  const counts = {} as FeatureCounts;
  for (const feature of MEDIA_FEATURES) counts[feature] = text.split(feature).length - 1;
  return counts;
}

/** `@keyframes` rules and `scroll-behavior: smooth` declarations in stylesheet text. */
export function countMotionRules(text: string): number {
  return (text.match(/@(?:-webkit-)?keyframes\b|scroll-behavior\s*:\s*smooth/gi) ?? []).length;
}

async function loadVariant(
  browser: BrowserLike,
  url: string,
  variant: Variant,
  options: Required<Omit<ScanOptions, 'userAgent' | 'onProgress'>> & { userAgent?: string },
  cssTexts: Map<string, string>,
): Promise<{ facts: PageFacts; finalUrl: string; screenshot?: Uint8Array }> {
  const context = await browser.newContext({
    ...VARIANTS[variant].media,
    viewport: options.viewport,
    ...(options.userAgent ? { userAgent: options.userAgent } : {}),
    serviceWorkers: 'block',
    acceptDownloads: false,
  });
  try {
    await context.addInitScript(recordMatchMediaQueries);
    let requests = 0;
    let bytes = 0;
    await context.route('**/*', async (route) => {
      requests += 1;
      const allowed =
        options.allowRequest(route.request().url()) &&
        requests <= options.maxRequests &&
        bytes <= options.maxBytes;
      await (allowed ? route.continue() : route.abort('blockedbyclient'));
    });

    const page = await context.newPage();
    const reads: Promise<void>[] = [];
    page.on('response', (response) => {
      const length = Number(response.headers()['content-length'] ?? 0);
      if (Number.isFinite(length)) bytes += length;
      if (
        variant === 'baseline' &&
        response.request().resourceType() === 'stylesheet' &&
        length <= MAX_CSS_TEXT
      ) {
        reads.push(
          response
            .text()
            .then((text) => {
              cssTexts.set(response.url(), text.slice(0, MAX_CSS_TEXT));
            })
            .catch(() => {}),
        );
      }
    });

    let response: { status(): number } | null;
    try {
      response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: options.navigationTimeoutMs,
      });
    } catch {
      throw new ScanError('navigation-failed', 'The page didn’t load.');
    }
    const status = response?.status() ?? 0;
    if (status >= 400) {
      throw new ScanError('http-status', `The page answered with HTTP ${status}.`, status);
    }
    const finalUrl = page.url();
    if (!options.allowRequest(finalUrl)) {
      throw new ScanError('redirect-blocked', 'The page redirected somewhere we can’t test.');
    }
    await page.waitForLoadState('load', { timeout: options.loadTimeoutMs }).catch(() => {});
    await page.waitForTimeout(options.settleMs);

    const collect: CollectOptions = {
      observeMs: OBSERVED.has(variant) ? options.observeMs : 0,
      sampleSize: options.sampleSize,
    };
    const facts = await page.evaluate(collectPageFacts, collect);
    const screenshot = options.screenshots
      ? await page.screenshot({ type: 'jpeg', quality: 45 })
      : undefined;
    await Promise.allSettled(reads);
    return { facts, finalUrl, ...(screenshot ? { screenshot } : {}) };
  } finally {
    await context.close().catch(() => {});
  }
}

/** Loads the page once per variant, in parallel, and returns what each load saw. */
export async function runScan(
  browser: BrowserLike,
  url: string,
  options: ScanOptions = {},
): Promise<ScanRun> {
  const resolved = {
    viewport: options.viewport ?? { width: 1280, height: 800 },
    ...(options.userAgent ? { userAgent: options.userAgent } : {}),
    navigationTimeoutMs: options.navigationTimeoutMs ?? 20_000,
    loadTimeoutMs: options.loadTimeoutMs ?? 8_000,
    settleMs: options.settleMs ?? 1_500,
    observeMs: options.observeMs ?? 6_000,
    sampleSize: options.sampleSize ?? 400,
    maxRequests: options.maxRequests ?? 250,
    maxBytes: options.maxBytes ?? 15 * 1024 * 1024,
    screenshots: options.screenshots ?? false,
    allowRequest: options.allowRequest ?? ((u: string) => requestRejection(u) === null),
  };
  const cssTexts = new Map<string, string>();
  let done = 0;
  const loads = await Promise.all(
    VARIANT_ORDER.map(async (variant) => {
      const result = await loadVariant(browser, url, variant, resolved, cssTexts);
      done += 1;
      options.onProgress?.(variant, done, VARIANT_ORDER.length);
      return [variant, result] as const;
    }),
  );

  const variants: ScanFacts['variants'] = {};
  const screenshots: ScanRun['screenshots'] = {};
  for (const [variant, result] of loads) {
    variants[variant] = result.facts;
    if (result.screenshot) screenshots[variant] = result.screenshot;
  }

  const externalCss = countFeatureMentions('');
  let externalMotionRules = 0;
  let unreadableSheets = 0;
  for (const href of variants.baseline?.css.unreadableHrefs ?? []) {
    const text = cssTexts.get(href);
    if (text === undefined) {
      unreadableSheets += 1;
      continue;
    }
    const counts = countFeatureMentions(text);
    for (const feature of MEDIA_FEATURES) externalCss[feature] += counts[feature];
    externalMotionRules += countMotionRules(text);
  }

  const baseline = loads.find(([v]) => v === 'baseline')?.[1];
  return {
    facts: {
      url,
      finalUrl: baseline?.finalUrl ?? url,
      variants,
      externalCss,
      externalMotionRules,
      unreadableSheets,
    },
    screenshots,
  };
}
