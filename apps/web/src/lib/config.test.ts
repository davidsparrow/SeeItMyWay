import { describe, expect, it } from 'vitest';
import { LOCAL_SITE_URL, normalizeUrl, resolveConfig } from './config';

describe('resolveConfig', () => {
  it('defaults to local development with optional services off', () => {
    expect(resolveConfig({})).toEqual({
      siteUrl: LOCAL_SITE_URL,
      sdkUrl: `${LOCAL_SITE_URL}/sdk/simw.global.js`,
      eventsUrl: null,
      scannerUrl: null,
    });
  });

  it("falls back to Vercel's production hostname", () => {
    const config = resolveConfig({ VERCEL_PROJECT_PRODUCTION_URL: 'seeitmyway.vercel.app' });
    expect(config.siteUrl).toBe('https://seeitmyway.vercel.app');
    expect(config.sdkUrl).toBe('https://seeitmyway.vercel.app/sdk/simw.global.js');
  });

  it('lets explicit values win and serves the SDK from the site unless told otherwise', () => {
    const config = resolveConfig({
      NEXT_PUBLIC_SITE_URL: 'https://example.org/',
      VERCEL_PROJECT_PRODUCTION_URL: 'seeitmyway.vercel.app',
      NEXT_PUBLIC_EVENTS_URL: 'https://events.example.workers.dev',
      NEXT_PUBLIC_SCANNER_URL: 'https://scanner.example.workers.dev/',
    });
    expect(config).toEqual({
      siteUrl: 'https://example.org',
      sdkUrl: 'https://example.org/sdk/simw.global.js',
      eventsUrl: 'https://events.example.workers.dev',
      scannerUrl: 'https://scanner.example.workers.dev',
    });
    expect(resolveConfig({ NEXT_PUBLIC_SDK_URL: 'https://cdn.example.net/simw.js' }).sdkUrl).toBe(
      'https://cdn.example.net/simw.js',
    );
  });

  it('treats empty or malformed values as unset', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('   ')).toBeNull();
    expect(normalizeUrl('not a url')).toBeNull();
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(resolveConfig({ NEXT_PUBLIC_EVENTS_URL: 'ftp://x' }).eventsUrl).toBeNull();
  });
});
