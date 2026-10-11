import { defineConfig, devices } from '@playwright/test';
import { DEMO_PORT, DEMO_URL, DEPLOYED_URL, WEB_PORT, WEB_URL } from './support/urls';

/**
 * Browser-test invariants. Run against built output (`pnpm build` first):
 * `next start` for apps/web and `vite preview` for apps/demo-sites.
 *
 * - `BASE_URL` points the web tests at a deployment instead (smoke test);
 *   the demo-sites fixture always runs locally.
 * - In a Claude Code cloud container Chromium is pre-installed
 *   (PLAYWRIGHT_BROWSERS_PATH); elsewhere run
 *   `pnpm exec playwright install --with-deps chromium` once.
 */
export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    ...(DEPLOYED_URL
      ? []
      : [
          {
            // Serves the build from `pnpm --filter @simw/web build:e2e` (it has a test events URL).
            command: `pnpm exec next start --port ${WEB_PORT}`,
            cwd: '../../apps/web',
            env: { SIMW_NEXT_DIST_DIR: '.next-e2e' },
            url: WEB_URL,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
          },
        ]),
    {
      command: `pnpm exec vite preview --port ${DEMO_PORT} --strictPort`,
      cwd: '../../apps/demo-sites',
      url: `${DEMO_URL}/index.html`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
