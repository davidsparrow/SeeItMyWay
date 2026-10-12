import { describe, expect, it, vi } from 'vitest';
import {
  bucketFontSize,
  type DetectorEnvironment,
  detectNativeSignals,
  detectPlatform,
  diffSnapshots,
  toSnapshot,
  watchNativeSignals,
} from './index';

const GAMUT = ['srgb', 'p3', 'rec2020'];

/** A fake `matchMedia` driven by a settings map. Features missing from the map are "unsupported". */
function fakeMedia(settings: Record<string, string>) {
  const listeners = new Set<() => void>();
  const matchMedia = (query: string) => {
    const match = /^\(([a-z-]+)(?::\s*([a-z0-9-]+))?\)$/.exec(query);
    const feature = match?.[1] ?? '';
    const value = match?.[2];
    const supported = feature in settings;
    const current = settings[feature];
    const matches =
      supported &&
      (value === undefined ||
        (feature === 'color-gamut'
          ? GAMUT.indexOf(value) <= GAMUT.indexOf(current ?? '')
          : current === value));
    return {
      media: supported ? query : 'not all',
      matches,
      addEventListener: (_type: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_type: string, cb: () => void) => listeners.delete(cb),
    } as unknown as MediaQueryList;
  };
  return {
    matchMedia,
    listenerCount: () => listeners.size,
    change(feature: string, value: string) {
      settings[feature] = value;
      for (const cb of [...listeners]) cb();
    },
  };
}

function env(settings: Record<string, string>, extra: Partial<DetectorEnvironment> = {}) {
  const media = fakeMedia(settings);
  return {
    media,
    env: {
      matchMedia: media.matchMedia,
      navigator: undefined,
      measureDefaultFontSize: () => 16,
      ...extra,
    } satisfies DetectorEnvironment,
  };
}

describe('detectNativeSignals', () => {
  it('reads supported media features and marks expressed preferences', () => {
    const { env: e } = env({
      'prefers-color-scheme': 'dark',
      'prefers-reduced-motion': 'reduce',
      'prefers-contrast': 'no-preference',
      pointer: 'coarse',
      hover: 'none',
      'color-gamut': 'p3',
    });
    const signals = detectNativeSignals(e);
    expect(signals['prefers-color-scheme']).toMatchObject({
      supported: true,
      value: 'dark',
      nature: 'preference',
      expressed: true,
    });
    expect(signals['prefers-reduced-motion'].expressed).toBe(true);
    expect(signals['prefers-contrast']).toMatchObject({ value: 'no-preference', expressed: false });
    expect(signals['color-gamut'].value).toBe('p3');
  });

  it('never describes input capability as a preference', () => {
    const { env: e } = env({ pointer: 'coarse', hover: 'none' });
    const signals = detectNativeSignals(e);
    expect(signals.pointer).toMatchObject({
      value: 'coarse',
      nature: 'environment',
      expressed: false,
    });
    expect(signals.hover.nature).toBe('environment');
  });

  it('reports features the browser does not understand as unsupported', () => {
    const { env: e } = env({ 'prefers-color-scheme': 'light' });
    const signals = detectNativeSignals(e);
    expect(signals['prefers-reduced-transparency']).toMatchObject({
      supported: false,
      value: null,
    });
    expect(signals['prefers-reduced-data'].supported).toBe(false);
  });

  it('treats light as "no active preference"', () => {
    const { env: e } = env({ 'prefers-color-scheme': 'light' });
    expect(detectNativeSignals(e)['prefers-color-scheme'].expressed).toBe(false);
  });

  it('reads Save-Data, Global Privacy Control and the default font size', () => {
    const { env: e } = env(
      {},
      {
        navigator: { connection: { saveData: true }, globalPrivacyControl: true } as never,
        measureDefaultFontSize: () => 20,
      },
    );
    const signals = detectNativeSignals(e);
    expect(signals['save-data']).toMatchObject({ supported: true, value: 'on', expressed: true });
    expect(signals['global-privacy-control']).toMatchObject({ value: 'on', expressed: true });
    expect(signals['default-font-size']).toMatchObject({
      value: 'larger',
      raw: 20,
      expressed: true,
    });
  });

  it('works with no window at all', () => {
    const signals = detectNativeSignals({});
    expect(Object.values(signals).every((s) => !s.supported)).toBe(true);
  });
});

describe('bucketFontSize', () => {
  it('maps Chrome’s presets to coarse buckets', () => {
    expect(bucketFontSize(12)).toBe('smaller');
    expect(bucketFontSize(16)).toBe('standard');
    expect(bucketFontSize(20)).toBe('larger');
    expect(bucketFontSize(24)).toBe('largest');
  });
});

describe('watchNativeSignals', () => {
  it('fires live when the visitor changes an OS setting, and cleans up', () => {
    const { env: e, media } = env({ 'prefers-reduced-motion': 'no-preference' });
    const listener = vi.fn();
    const stop = watchNativeSignals(listener, e);
    expect(media.listenerCount()).toBeGreaterThan(0);

    media.change('prefers-reduced-motion', 'reduce');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[1]).toEqual([
      { id: 'prefers-reduced-motion', from: 'no-preference', to: 'reduce' },
    ]);

    stop();
    expect(media.listenerCount()).toBe(0);
  });
});

describe('diffSnapshots', () => {
  it('lists changed signals only', () => {
    const a = toSnapshot(detectNativeSignals(env({ 'prefers-contrast': 'no-preference' }).env));
    const b = toSnapshot(detectNativeSignals(env({ 'prefers-contrast': 'more' }).env));
    expect(diffSnapshots(a, b)).toEqual([
      { id: 'prefers-contrast', from: 'no-preference', to: 'more' },
    ]);
  });
});

describe('detectPlatform', () => {
  const nav = (userAgent: string, maxTouchPoints = 0, extra: object = {}) =>
    ({ userAgent, maxTouchPoints, ...extra }) as never;

  it.each([
    [
      'iPhone Safari',
      nav(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      ),
      { os: 'ios', browser: 'safari', mobile: true },
    ],
    [
      'iPad pretending to be a Mac',
      nav(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
        5,
      ),
      { os: 'ipados', browser: 'safari', mobile: false },
    ],
    [
      'Mac Chrome',
      nav(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      ),
      { os: 'macos', browser: 'chrome', mobile: false },
    ],
    [
      'Windows Edge',
      nav(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
      ),
      { os: 'windows', browser: 'edge', mobile: false },
    ],
    [
      'Android Samsung Internet',
      nav(
        'Mozilla/5.0 (Linux; Android 15; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
      ),
      { os: 'android', browser: 'samsung', mobile: true },
    ],
    [
      'ChromeOS',
      nav(
        'Mozilla/5.0 (X11; CrOS x86_64 16000.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      ),
      { os: 'chromeos', browser: 'chrome', mobile: false },
    ],
    [
      'Linux Firefox',
      nav('Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0'),
      { os: 'linux', browser: 'firefox', mobile: false },
    ],
    [
      'Brave',
      nav(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        0,
        { brave: {} },
      ),
      { os: 'windows', browser: 'brave', mobile: false },
    ],
  ])('%s', (_name, navigator, expected) => {
    expect(detectPlatform(navigator)).toEqual(expected);
  });
});
