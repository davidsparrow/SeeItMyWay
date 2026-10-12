import { expect, test } from '@playwright/test';
import { analyze, type BrowserLike, type Check, type CheckId, runScan } from '@simw/scanner-core';
import { DEMO_URL, DEPLOYED_URL, WEB_URL } from '../support/urls';

/**
 * Scanner calibration: the real V0C driver and rubric, run in local Chromium
 * against pages whose behavior we know. The Worker runs the same driver on
 * Cloudflare Browser Run.
 */

// Local fixtures live on localhost, which the production URL guards refuse.
const LOCAL = { allowRequest: () => true, observeMs: 6_000 };

async function scan(browser: unknown, url: string) {
  const { facts } = await runScan(browser as BrowserLike, url, LOCAL);
  const { checks, score } = analyze(facts);
  const byId = Object.fromEntries(checks.map((c) => [c.id, c])) as Record<CheckId, Check>;
  return { facts, checks: byId, score };
}

test.describe.configure({ timeout: 60_000 });

test('scanner calibration: the Bramble fixture without SeeItMyWay is known-bad', async ({
  browser,
}) => {
  const { checks, score } = await scan(browser, `${DEMO_URL}/plain.html`);
  expect(checks['reduced-motion-listens'].status).toBe('fail');
  expect(checks['reduced-motion-animation'].status).toBe('fail');
  expect(checks['reduced-motion-media']).toMatchObject({
    status: 'fail',
    title: 'Hero video ignores motion preference',
  });
  expect(checks['color-scheme'].status).toBe('fail');
  expect(checks.contrast.status).toBe('fail');
  expect(checks.viewport.status).toBe('pass');
  // No carousel (7), no hover-only content (10), a viewport (5), no sound (5), forced colors left to the browser (5).
  expect(score).toBe(32);
});

for (const fixture of ['index.html', 'script-tag.html']) {
  test(`scanner calibration: the Bramble fixture with the SDK (${fixture}) is known-good`, async ({
    browser,
  }) => {
    const { checks, score } = await scan(browser, `${DEMO_URL}/${fixture}`);
    for (const id of [
      'reduced-motion-listens',
      'reduced-motion-animation',
      'reduced-motion-media',
      'color-scheme',
      'contrast',
      'forced-colors',
    ] as const) {
      expect(checks[id], id).toMatchObject({ status: 'pass' });
    }
    expect(score).toBeGreaterThanOrEqual(90);
  });
}

test('scanner calibration: Northlight hears motion, theme and contrast, and its carousel waits', async ({
  browser,
}) => {
  test.skip(Boolean(DEPLOYED_URL), 'Calibrates against the local build.');
  const { facts, checks, score } = await scan(browser, `${WEB_URL}/demo`);
  expect(facts.variants.baseline?.carousel.advances).toBeGreaterThan(0);
  expect(checks.carousel).toMatchObject({
    status: 'pass',
    title: 'Carousel waits for reduced-motion visitors',
  });
  expect(checks['reduced-motion-listens'].status).toBe('pass');
  expect(checks['color-scheme'].status).toBe('pass');
  expect(checks.contrast.status).toBe('pass');
  expect(score).toBeGreaterThanOrEqual(80);
});
