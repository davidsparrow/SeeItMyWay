/**
 * How long the scanner Worker keeps things (apps/scanner wrangler.jsonc:
 * REPORT_TTL_DAYS, VIEWS_TTL_HOURS). Shown before a scan; a finished report
 * carries its own exact expiry.
 */
export const SCANNER_RETENTION = { reportDays: 30, viewHours: 24 } as const;

/** What each emulated load is called while a scan runs. */
export const PROGRESS_LABELS = {
  baseline: 'As most visitors see it',
  'reduced-motion': 'With reduced motion requested',
  dark: 'With dark mode requested',
  'more-contrast': 'With more contrast requested',
  'forced-colors': 'With forced colors',
} as const;
