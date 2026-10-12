import { expect, type Page, test } from '@playwright/test';

async function saveDarkPassport(page: Page) {
  await page.goto('/passport', { waitUntil: 'load' });
  const theme = page.getByRole('group', { name: 'Theme' }).first();
  await theme.getByText('Dark', { exact: true }).click();
  await page.getByRole('button', { name: 'Save my Passport' }).click();
  await expect(
    page.getByText('✓ Saved on this device. This site is now following it.'),
  ).toBeVisible();
}

test('INV-2: a stored dark Passport paints dark first on a light device, with no light flash', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await saveDarkPassport(page);

  // Block every script bundle, so the only thing that can set the theme is the
  // inline boot script in <head>: what you see here is what first paint sees.
  await page.route('**/_next/static/**/*.js', (route) => route.abort());
  await page.goto('/privacy', { waitUntil: 'commit' });

  await expect(page.locator('html')).toHaveAttribute('data-simw-color-scheme', 'dark');
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme))
    .toBe('dark');
  // The site's dark background, without React ever hydrating.
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe('rgb(13, 14, 19)');
});

test('forced colors override an explicit dark Passport, which stays saved', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await saveDarkPassport(page);

  await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
  await page.goto('/passport', { waitUntil: 'load' });
  await expect(page.locator('html')).toHaveAttribute('data-simw-forced-colors', 'active');
  await expect(page.locator('html')).toHaveAttribute('data-simw-color-scheme', 'light');
  // The stated choice is still Dark, and the page says why it isn't applied.
  const theme = page.getByRole('group', { name: 'Theme' }).first();
  await expect(theme.getByRole('radio', { name: 'Dark' })).toBeChecked();
  await expect(theme).toContainText('Your device is using forced colors right now');
});
