import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: [
    '@simw/adapters',
    '@simw/detector',
    '@simw/privacy',
    '@simw/protocol',
    '@simw/sdk',
    '@simw/types',
    '@simw/ui',
  ],
  reactStrictMode: true,
  // The browser tests build into .next-e2e (scripts/build-e2e.mjs) so they never mix with .next.
  distDir: process.env.SIMW_NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  env: {
    // Vercel's production hostname, made available to client code so the site URL
    // (src/lib/config.ts) is the same on the server and in the browser.
    SIMW_VERCEL_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? '',
  },
};

export default nextConfig;
