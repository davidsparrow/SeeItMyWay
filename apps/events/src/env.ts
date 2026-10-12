export interface Env {
  /** D1 database holding `event_counts` (see migrations/). */
  DB: D1Database;
  /**
   * Comma-separated origins allowed to send events. `*` matches one DNS label,
   * for Vercel previews: `https://seeitmyway-*-team.vercel.app`.
   */
  ALLOWED_ORIGINS: string;
  /** Optional Workers Rate Limiting binding. Counters are ephemeral and never written to D1. */
  RATE_LIMITER?: RateLimit;
}
