import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { DEPLOYED_URL } from '../support/urls';

const GPC_MESSAGE =
  'Global Privacy Control detected — SeeItMyWay heard you. Anonymous research counting is disabled for this visit.';

/** Intercepts every request to an events backend, on any host, and records its body. */
async function captureEvents(context: BrowserContext): Promise<string[]> {
  const bodies: string[] = [];
  await context.route('**/v1/events', async (route) => {
    bodies.push(route.request().postData() ?? '');
    await route.fulfill({ status: 204 });
  });
  return bodies;
}

/** What a tab switch does: the remote sink flushes on visibilitychange → hidden. */
async function hide(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

async function runCheckup(page: Page) {
  await page.goto('/', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Show me mine' }).click();
  await expect(
    page.getByRole('heading', { name: 'Here’s how the web sees your preferences.' }),
  ).toBeVisible();
}

test('GPC: the Checkup says SeeItMyWay heard you, and no request reaches the events backend', async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', {
      configurable: true,
      get: () => true,
    });
  });
  const sent = await captureEvents(context);
  const seen: string[] = [];
  context.on('request', (request) => {
    if (request.url().includes('/v1/events')) seen.push(request.url());
  });

  await runCheckup(page);
  // Near the summary, and on the Privacy signal card.
  const notice = page.getByTestId('gpc-notice').first();
  await expect(notice).toContainText(GPC_MESSAGE);
  await expect(notice.getByRole('link', { name: 'How we handle it' })).toHaveAttribute(
    'href',
    '/privacy',
  );
  await expect(page.getByRole('article', { name: 'Privacy signal' })).toContainText(GPC_MESSAGE);
  // Research questions are hidden: their answers couldn't be counted.
  await expect(
    page.getByText('Before today, did you know websites could detect this?'),
  ).toHaveCount(0);
  await expect(page.getByText(/aren’t counted this visit/)).toBeVisible();

  // Do things that would otherwise be counted, then leave the page.
  await page.getByRole('button', { name: 'Check again' }).click();
  await hide(page);
  await page.goto('/privacy', { waitUntil: 'load' });
  await expect(page.getByText('Your browser is sending Global Privacy Control')).toBeVisible();
  await hide(page);

  expect(sent).toEqual([]);
  expect(seen).toEqual([]);
  // Local-only state is fine: the on-device log still shows what happened.
  await expect(page.locator('pre').filter({ hasText: 'checkup_started' })).toBeVisible();
});

test('without GPC, anonymous events are batched to the events backend', async ({
  page,
  context,
}) => {
  test.skip(Boolean(DEPLOYED_URL), 'Needs the local build, which has a test events URL baked in.');
  const sent = await captureEvents(context);

  await runCheckup(page);
  await hide(page);

  await expect.poll(() => sent.length).toBeGreaterThan(0);
  const events = sent.flatMap((body) => (JSON.parse(body) as { events: unknown[] }).events);
  expect(events).toContainEqual({ name: 'checkup_started', props: {} });
  expect(events).toContainEqual({ name: 'signals_detected', props: { count: expect.any(Number) } });
});
