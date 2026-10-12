import { expect, test } from '@playwright/test';
import { DEMO_URL } from '../support/urls';

const FIXTURES = [
  { name: 'npm', path: '/index.html' },
  { name: 'script tag', path: '/script-tag.html' },
];

const videoAutoplay = () => document.querySelector('video')?.autoplay;
const badgeIterations = () => {
  const badge = document.querySelector('.badge');
  return badge ? getComputedStyle(badge).animationIterationCount : null;
};

for (const fixture of FIXTURES) {
  test(`INV-3: the plain-HTML SDK (${fixture.name}) suppresses autoplaying visual motion under reduced motion`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(DEMO_URL + fixture.path, { waitUntil: 'load' });

    await expect(page.locator('html')).toHaveAttribute('data-simw-motion', 'reduced');
    await expect.poll(() => page.evaluate(videoAutoplay)).toBe(false);
    await expect.poll(() => page.evaluate(badgeIterations)).toBe('1');
    // The stated autoplay preference isn't rewritten: the <video> is held back
    // because it is visual motion.
    await expect(page.locator('html')).toHaveAttribute('data-simw-autoplay', 'allowed');
  });

  test(`INV-3 control: without reduced motion the ${fixture.name} fixture keeps its motion`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(DEMO_URL + fixture.path, { waitUntil: 'load' });

    await expect(page.locator('html')).toHaveAttribute('data-simw-motion', 'full');
    await expect.poll(() => page.evaluate(videoAutoplay)).toBe(true);
    await expect.poll(() => page.evaluate(badgeIterations)).toBe('infinite');
  });
}
