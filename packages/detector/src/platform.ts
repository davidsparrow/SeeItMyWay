import type { BrowserFamily, OperatingSystem, PlatformInfo } from '@simw/types';

interface UADataLike {
  platform?: string;
  mobile?: boolean;
}

type NavigatorLike = Pick<Navigator, 'userAgent' | 'maxTouchPoints'> & {
  userAgentData?: UADataLike;
  brave?: unknown;
};

/**
 * Coarse platform detection, used only to pick which "how to change this"
 * instructions to show first. Never stored, never sent.
 */
export function detectPlatform(
  nav: NavigatorLike | undefined = globalThis.navigator,
): PlatformInfo {
  if (!nav) return { os: 'unknown', browser: 'other', mobile: false };
  const ua = nav.userAgent ?? '';
  const platform = nav.userAgentData?.platform?.toLowerCase() ?? '';

  let os: OperatingSystem = 'unknown';
  if (/iphone|ipod/i.test(ua)) os = 'ios';
  // iPadOS Safari reports itself as a Mac; touch support gives it away.
  else if (/ipad/i.test(ua) || (/macintosh/i.test(ua) && (nav.maxTouchPoints ?? 0) > 1))
    os = 'ipados';
  else if (/android/i.test(ua) || platform === 'android') os = 'android';
  else if (/\bcros\b/i.test(ua) || platform === 'chrome os' || platform === 'chromeos')
    os = 'chromeos';
  else if (/windows/i.test(ua) || platform === 'windows') os = 'windows';
  else if (/macintosh|mac os x/i.test(ua) || platform === 'macos') os = 'macos';
  else if (/linux|x11/i.test(ua) || platform === 'linux') os = 'linux';

  let browser: BrowserFamily = 'other';
  if (nav.brave !== undefined) browser = 'brave';
  else if (/edg(e|a|ios)?\//i.test(ua)) browser = 'edge';
  else if (/samsungbrowser/i.test(ua)) browser = 'samsung';
  else if (/opr\/|opera/i.test(ua)) browser = 'opera';
  else if (/firefox|fxios/i.test(ua)) browser = 'firefox';
  else if (/crios|chrome|chromium/i.test(ua)) browser = 'chrome';
  else if (/safari/i.test(ua)) browser = 'safari';

  const mobile = nav.userAgentData?.mobile ?? (os === 'ios' || /mobi|android.+mobile/i.test(ua));

  return { os, browser, mobile };
}
