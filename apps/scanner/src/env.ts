export interface Env {
  /** D1 database holding scan_reports and scan_views (see migrations/). */
  DB: D1Database;
  /** Cloudflare Browser Run binding. */
  BROWSER: Fetcher;
  /** Comma-separated origins of apps/web allowed to call the scanner. `*` matches one DNS label. */
  ALLOWED_ORIGINS: string;
  /** The web app's public URL, for the honest user agent (`+<url>/listen`). */
  PUBLIC_SITE_URL: string;
  /** How long reports are kept, in days. */
  REPORT_TTL_DAYS: string;
  /** How long emulated screenshots are kept, in hours. */
  VIEWS_TTL_HOURS: string;
  /** Ephemeral Workers Rate Limiting counters; nothing is written to D1. */
  SCAN_CLIENT_LIMITER?: RateLimit;
  SCAN_TARGET_LIMITER?: RateLimit;
  SCAN_GLOBAL_LIMITER?: RateLimit;
}
