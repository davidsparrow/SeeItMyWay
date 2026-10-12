import { zeroCounts } from './analyze';
import type { PageFacts, ScanFacts, Variant } from './types';

/** A plain light page that listens for nothing. Tests override what they need. */
export function pageFacts(overrides: Partial<PageFacts> = {}): PageFacts {
  return {
    viewport: { width: 1280, height: 800 },
    viewportMeta: 'width=device-width, initial-scale=1',
    colorSchemeMeta: null,
    rootColorScheme: 'normal',
    css: {
      features: zeroCounts(),
      lightDark: 0,
      readableSheets: 1,
      unreadableHrefs: [],
      hoverRevealRules: 0,
    },
    queried: zeroCounts(),
    colors: {
      background: [255, 255, 255],
      text: [40, 40, 40],
      signature: Array.from({ length: 50 }, (_, i) => `P|rgb(40, 40, 40)|rgba(0, 0, 0, 0)|${i}`),
    },
    animations: { running: 0, infinite: 0 },
    media: [],
    carousel: { candidates: 0, advances: 0 },
    ...overrides,
  };
}

export function scanFacts(variants: Partial<Record<Variant, PageFacts>>): ScanFacts {
  const baseline = variants.baseline ?? pageFacts();
  return {
    url: 'https://example.com/',
    finalUrl: 'https://example.com/',
    variants: {
      baseline,
      'reduced-motion': baseline,
      dark: baseline,
      'more-contrast': baseline,
      'forced-colors': baseline,
      ...variants,
    },
    externalCss: zeroCounts(),
    unreadableSheets: 0,
  };
}
