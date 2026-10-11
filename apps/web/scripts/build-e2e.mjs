// The build the browser tests run against: identical to `pnpm build`, except it
// has a test events URL baked in (nothing listens there; the tests intercept the
// requests) and it lives in its own distDir, so it never mixes with .next.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const env = {
  ...process.env,
  SIMW_NEXT_DIST_DIR: '.next-e2e',
  NEXT_PUBLIC_EVENTS_URL: 'http://127.0.0.1:8799',
};
for (const args of [['scripts/copy-sdk.mjs'], [require.resolve('next/dist/bin/next'), 'build']]) {
  const { status } = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (status !== 0) process.exit(status ?? 1);
}
