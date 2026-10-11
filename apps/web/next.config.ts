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
  poweredByHeader: false,
};

export default nextConfig;
