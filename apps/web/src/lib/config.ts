/**
 * Deployment configuration, read from the environment once.
 *
 * Nothing in the app hard-codes a hostname: the production URL is whatever
 * Vercel assigns until a domain is chosen, and the events and scanner
 * Workers are optional. Protocol identity (`urn:simw:protocol:<version>`)
 * never depends on any of these.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so changing one means
 * rebuilding. `VERCEL_PROJECT_PRODUCTION_URL` is passed through to the client
 * bundle by next.config.ts.
 */

export interface SiteConfig {
  /** Absolute origin of this site, no trailing slash. */
  siteUrl: string;
  /** Where the SDK's script-tag build is served from. */
  sdkUrl: string;
  /** Events Worker base URL. Null keeps anonymous counting on this device only. */
  eventsUrl: string | null;
  /** Scanner Worker base URL. Null keeps /listen in its "coming soon" state. */
  scannerUrl: string | null;
}

export interface ConfigEnv {
  NEXT_PUBLIC_SITE_URL?: string | undefined;
  NEXT_PUBLIC_SDK_URL?: string | undefined;
  NEXT_PUBLIC_EVENTS_URL?: string | undefined;
  NEXT_PUBLIC_SCANNER_URL?: string | undefined;
  /** Set by Vercel: the production hostname, without a scheme. */
  VERCEL_PROJECT_PRODUCTION_URL?: string | undefined;
}

export const LOCAL_SITE_URL = 'http://localhost:3000';
export const SDK_PATH = '/sdk/simw.global.js';

/** An absolute http(s) URL without a trailing slash, or null for anything else (unset, empty, malformed). */
export function normalizeUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.href.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export function resolveConfig(env: ConfigEnv): SiteConfig {
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const siteUrl =
    normalizeUrl(env.NEXT_PUBLIC_SITE_URL) ??
    (vercelHost ? normalizeUrl(`https://${vercelHost}`) : null) ??
    LOCAL_SITE_URL;
  return {
    siteUrl,
    sdkUrl: normalizeUrl(env.NEXT_PUBLIC_SDK_URL) ?? `${siteUrl}${SDK_PATH}`,
    eventsUrl: normalizeUrl(env.NEXT_PUBLIC_EVENTS_URL),
    scannerUrl: normalizeUrl(env.NEXT_PUBLIC_SCANNER_URL),
  };
}

// Each variable is spelled out in full so Next can inline it into client bundles.
export const config: SiteConfig = resolveConfig({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SDK_URL: process.env.NEXT_PUBLIC_SDK_URL,
  NEXT_PUBLIC_EVENTS_URL: process.env.NEXT_PUBLIC_EVENTS_URL,
  NEXT_PUBLIC_SCANNER_URL: process.env.NEXT_PUBLIC_SCANNER_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.SIMW_VERCEL_PRODUCTION_URL,
});
