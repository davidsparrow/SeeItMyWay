import { clearExperience } from '@simw/adapters';
import type { DetectorEnvironment } from '@simw/detector';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bootScript,
  createLocalPassport,
  createSeeItMyWay,
  memoryStore,
  type SeeItMyWayOptions,
  siteKeys,
} from './index';

function fakeDetector(settings: Record<string, string>) {
  const listeners = new Set<() => void>();
  const matchMedia = (query: string) => {
    const match = /^\(([a-z-]+)(?::\s*([a-z0-9-]+))?\)$/.exec(query);
    const feature = match?.[1] ?? '';
    const value = match?.[2];
    const supported = feature in settings;
    return {
      media: supported ? query : 'not all',
      matches: supported && (value === undefined || settings[feature] === value),
      addEventListener: (_t: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_t: string, cb: () => void) => listeners.delete(cb),
    } as unknown as MediaQueryList;
  };
  const detector: DetectorEnvironment = { matchMedia, measureDefaultFontSize: () => 16 };
  return {
    detector,
    change(feature: string, value: string) {
      settings[feature] = value;
      for (const cb of [...listeners]) cb();
    },
  };
}

function setup(settings: Record<string, string> = {}, options: Partial<SeeItMyWayOptions> = {}) {
  const storage = memoryStore();
  const media = fakeDetector({
    'prefers-color-scheme': 'light',
    'prefers-reduced-motion': 'no-preference',
    ...settings,
  });
  const sdk = createSeeItMyWay({
    site: 'test',
    storage,
    detector: media.detector,
    passport: createLocalPassport(storage),
    safeAdapters: false,
    ...options,
  });
  return { sdk, storage, media };
}

afterEach(() => clearExperience(document.documentElement));

describe('createSeeItMyWay', () => {
  it('renders defaults until started, then applies what the browser says', () => {
    const { sdk } = setup({ 'prefers-color-scheme': 'dark' });
    expect(sdk.getState().ready).toBe(false);
    expect(document.documentElement.hasAttribute('data-simw-color-scheme')).toBe(false);

    sdk.start();
    expect(sdk.getState().ready).toBe(true);
    expect(sdk.getState().experience.colorScheme).toBe('dark');
    expect(document.documentElement.getAttribute('data-simw-color-scheme')).toBe('dark');
    sdk.stop();
  });

  it('keeps a stable server snapshot for hydration', () => {
    const { sdk } = setup();
    const server = sdk.getServerState();
    sdk.start();
    expect(sdk.getServerState()).toBe(server);
    expect(server.ready).toBe(false);
    sdk.stop();
  });

  it('persists local Tune overrides per site', () => {
    const { sdk, storage, media } = setup();
    sdk.start();
    sdk.setOverride('density', 'roomy');
    expect(sdk.getState().experience.density).toBe('roomy');
    expect(sdk.getState().sources.density).toBe('site-override');
    sdk.stop();

    const again = createSeeItMyWay({
      site: 'test',
      storage,
      detector: media.detector,
      safeAdapters: false,
    });
    again.start();
    expect(again.getState().experience.density).toBe('roomy');
    again.setOverride('density', null);
    expect(again.getState().experience.density).toBe('standard');
    again.stop();
  });

  it('picks up Passport changes live and shares only a clean packet', () => {
    const { sdk, storage } = setup();
    const passport = createLocalPassport(storage);
    sdk.start();
    passport.write({ motion: 'reduced', visualRichness: 'rich' });
    expect(sdk.getState().experience.visualRichness).toBe('rich');
    expect(sdk.sharedPacket()).toEqual({
      version: '0.1',
      motion: 'reduced',
      visualRichness: 'rich',
    });
    sdk.stop();
  });

  it('notifies on live native changes so the UI can celebrate', () => {
    const { sdk, media } = setup();
    const onChange = vi.fn();
    sdk.start();
    sdk.onNativeChange(onChange);
    media.change('prefers-reduced-motion', 'reduce');
    expect(onChange).toHaveBeenCalledWith([
      { id: 'prefers-reduced-motion', from: 'no-preference', to: 'reduce' },
    ]);
    expect(sdk.getState().experience.motion).toBe('reduced');
    // Already seen: a manual re-check reports nothing new.
    expect(sdk.recheck()).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(1);
    sdk.stop();
  });

  it('simulates native signals without touching what was detected', () => {
    const { sdk } = setup();
    sdk.start();
    sdk.simulate({ 'prefers-contrast': 'more', 'prefers-color-scheme': 'dark' });
    expect(sdk.getState().simulated).toBe(true);
    expect(sdk.getState().experience.contrast).toBe('more');
    expect(sdk.getState().detected['prefers-color-scheme']).toBe('light');
    sdk.simulate(null);
    expect(sdk.getState().experience.contrast).toBe('standard');
    sdk.stop();
  });

  it('keeps a stable anonymous seed when variants are enabled', () => {
    const { sdk, storage } = setup({}, { variants: 4 });
    sdk.start();
    const seed = sdk.getState().seed;
    expect(seed).toMatch(/^[0-9a-f]{16}$/);
    expect(storage.get(siteKeys('test').seed)).toBe(seed);
    expect(sdk.getState().experience.variant).not.toBeNull();
    sdk.stop();
  });
});

describe('bootScript', () => {
  it('applies the last snapshot before the SDK loads', () => {
    localStorage.setItem(
      siteKeys('boot').applied,
      JSON.stringify({
        attrs: { 'data-simw-color-scheme': 'dark', 'data-simw-density': 'roomy', onclick: 'x' },
        tokens: { '--simw-spacing-scale': '1.3' },
        followsSystemScheme: false,
      }),
    );
    new Function(bootScript('boot'))();
    const html = document.documentElement;
    expect(html.getAttribute('data-simw-color-scheme')).toBe('dark');
    expect(html.getAttribute('data-simw-density')).toBe('roomy');
    expect(html.hasAttribute('onclick')).toBe(false);
    expect(html.style.getPropertyValue('--simw-spacing-scale')).toBe('1.3');
    localStorage.clear();
  });

  it('falls back to native media queries on a first visit', () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes('dark') })) as never;
    new Function(bootScript('fresh'))();
    expect(document.documentElement.getAttribute('data-simw-color-scheme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-simw-motion')).toBe('full');
  });
});
