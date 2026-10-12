import { expect, test } from '@playwright/test';

const LOCAL_LOG_KEY = 'simw:local-event-log';

test('INV-1: a live OS preference change is detected and celebrated without a refresh', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' });
  await page.goto('/', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Show me mine' }).click();
  await expect(
    page.getByRole('heading', { name: 'Here’s how the web sees your preferences.' }),
  ).toBeVisible();
  const motionCard = page.getByRole('article', { name: 'Motion' });
  await expect(motionCard).toContainText('Full motion currently allowed');
  await expect(page.locator('html')).toHaveAttribute('data-simw-motion', 'full');

  // Change the "OS setting" while the page is open: no reload, no click.
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await expect(page.locator('.toast-region')).toContainText(
    'Your browser now asks websites for reduced motion.',
  );
  await expect(motionCard).toContainText('Reduced motion requested');
  await expect(page.locator('html')).toHaveAttribute('data-simw-motion', 'reduced');

  // With no Global Privacy Control, the change is recorded in the local event log.
  const log = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[],
    LOCAL_LOG_KEY,
  );
  expect(log).toContainEqual({
    name: 'preference_changed',
    props: { signal: 'prefers-reduced-motion', to: 'reduce' },
  });
});
