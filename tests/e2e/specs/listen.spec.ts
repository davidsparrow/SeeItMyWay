import { expect, type Page, type Route, test } from '@playwright/test';
import { buildReport, type ScanReport } from '@simw/scanner-core';
import { pageFacts, scanFacts } from '@simw/scanner-core/fixtures';
import { DEPLOYED_URL } from '../support/urls';

test.skip(Boolean(DEPLOYED_URL), 'Needs the local build, which has a test scanner URL baked in.');

const ID = 'Rep0rtIdForTheE2eSpecs';

function sampleReport(): ScanReport {
  const base = pageFacts();
  const facts = scanFacts({
    baseline: base,
    dark: pageFacts({ colors: { background: [13, 14, 19], text: [240, 240, 240], signature: [] } }),
    'reduced-motion': base,
  });
  return buildReport(
    { ...facts, url: 'https://example.com/pricing', finalUrl: 'https://example.com/pricing' },
    {
      id: ID,
      scannedAt: new Date('2026-10-11T12:00:00Z'),
      expiresAt: new Date('2026-11-10T12:00:00Z'),
      views: [
        { variant: 'baseline', label: 'No preferences expressed' },
        { variant: 'dark', label: 'Asks for dark mode' },
      ],
      viewsExpireAt: new Date('2026-10-12T12:00:00Z'),
    },
  );
}

async function fakeScanner(page: Page) {
  const report = sampleReport();
  const bodies: string[] = [];
  await page.route('**/v1/scans', async (route: Route) => {
    bodies.push(route.request().postData() ?? '');
    const lines = [
      { type: 'accepted', url: report.url, stripped: { query: false, fragment: false } },
      ...['baseline', 'reduced-motion', 'dark', 'more-contrast', 'forced-colors'].map(
        (variant, i) => ({
          type: 'progress',
          variant,
          done: i + 1,
          total: 5,
        }),
      ),
      { type: 'report', report, reused: false },
    ];
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/x-ndjson', 'Access-Control-Allow-Origin': '*' },
      body: lines.map((l) => JSON.stringify(l)).join('\n'),
    });
  });
  await page.route(`**/v1/reports/${ID}`, (route) =>
    route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, json: report }),
  );
  // Screenshots have expired: the report should fall back to the Playground.
  await page.route('**/v1/reports/*/views/*', (route) => route.fulfill({ status: 404 }));
  await page.route('**/v1/reports/Missing0000000000000000', (route) =>
    route.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, json: {} }),
  );
  return { report, bodies };
}

test('/listen runs the Site Listener Test and shows the score and rows', async ({ page }) => {
  const { bodies } = await fakeScanner(page);
  await page.goto('/listen', { waitUntil: 'load' });
  await expect(page.getByText(/from Cloudflare’s network, once for each preference/)).toBeVisible();

  await page.getByLabel('Your website address').fill('example.com/pricing?utm_source=ad#plans');
  await page.getByRole('button', { name: 'Test my site' }).click();

  const report = page.getByTestId('scan-report');
  await expect(report).toBeVisible();
  // The query string and fragment never left the browser.
  expect(bodies.map((b) => JSON.parse(b))).toEqual([{ url: 'https://example.com/pricing' }]);
  await expect(
    page.getByText('We removed the part after ? or # from the address before testing it.'),
  ).toBeVisible();

  await expect(report.getByText(/^\d+\s*\/ 100$/)).toBeVisible();
  await expect(report.getByText('Dark mode respected')).toBeVisible();
  await expect(report.getByText('Contrast preference not supported')).toBeVisible();
  await expect(
    report.getByRole('link', {
      name: 'See a site through different preferences in the Playground',
    }),
  ).toBeVisible();
  await expect(
    report.getByRole('link', { name: new RegExp(`/listen/report/${ID}$`) }),
  ).toBeVisible();
  await expect(report).toContainText('not an accessibility audit');

  const log = await page.evaluate(
    () => JSON.parse(localStorage.getItem('simw:local-event-log') ?? '[]') as unknown[],
  );
  expect(log).toContainEqual({ name: 'owner_test_interest', props: {} });
  expect(log).toContainEqual({
    name: 'owner_test_completed',
    props: { score: expect.stringMatching(/^\d+-\d+$/) },
  });
});

test('/listen refuses private addresses before contacting the scanner', async ({ page }) => {
  const { bodies } = await fakeScanner(page);
  await page.goto('/listen', { waitUntil: 'load' });
  await page.getByLabel('Your website address').fill('http://192.168.1.1/admin');
  await page.getByRole('button', { name: 'Test my site' }).click();
  // Next's route announcer is also an alert, so pick ours by its text.
  await expect(
    page.getByRole('alert').filter({ hasText: 'Please use the site’s name, not an IP address.' }),
  ).toBeVisible();
  expect(bodies).toEqual([]);
});

test('a shared report loads by id, and an expired one says so', async ({ page }) => {
  await fakeScanner(page);
  await page.goto(`/listen/report/${ID}`, { waitUntil: 'load' });
  await expect(page.getByTestId('scan-report')).toContainText('Your Preference Awareness Score');
  await expect(page.getByTestId('scan-report')).toContainText('https://example.com/pricing');

  await page.goto('/listen/report/Missing0000000000000000', { waitUntil: 'load' });
  await expect(
    page.getByText('This report doesn’t exist or has expired.', { exact: false }),
  ).toBeVisible();
});
