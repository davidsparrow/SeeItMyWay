import { launch } from '@cloudflare/playwright';
import { type BrowserLike, runScan, type ScanRun, type Variant } from '@simw/scanner-core';
import type { Env } from './env';

/** Runs one scan in a fresh Browser Run session, and always closes it. */
export async function scanWithBrowserRun(
  env: Env,
  url: string,
  onProgress: (variant: Variant, done: number, total: number) => void,
): Promise<ScanRun> {
  const browser = await launch(env.BROWSER);
  try {
    // An honest user agent: the real Chrome string plus who we are and where to read about it.
    // No PUBLIC_SITE_URL, no link: never point site owners at a hostname we don't control.
    const site = (env.PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');
    const about = site ? ` (+${site}/listen)` : '';
    const userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36 SeeItMyWaySiteListener/0.1${about}`;
    return await runScan(browser as unknown as BrowserLike, url, {
      userAgent,
      screenshots: true,
      onProgress,
    });
  } finally {
    await browser.close().catch(() => {});
  }
}
