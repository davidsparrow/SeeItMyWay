import { DEFAULT_EXPERIENCE, type Experience, resolveExperience } from '@simw/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  allowsAutoAdvance,
  applyExperience,
  autoplayMode,
  clearExperience,
  columnsFor,
  experienceToAttributes,
  experienceToTokens,
  installSafeAdapters,
  MOTION_CSS,
  revealsOnHover,
  targetSize,
  transitionStyle,
} from './index';

const exp = (overrides: Partial<Experience> = {}): Experience => ({
  ...DEFAULT_EXPERIENCE,
  ...overrides,
});

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  clearExperience(document.documentElement);
});

describe('attributes and tokens', () => {
  it('describes every dimension as a data attribute', () => {
    const attrs = experienceToAttributes(exp({ motion: 'reduced', variant: 2, hover: false }));
    expect(attrs['data-simw-motion']).toBe('reduced');
    expect(attrs['data-simw-variant']).toBe('2');
    expect(attrs['data-simw-hover']).toBe('none');
  });

  it('turns density, text size and motion into CSS tokens', () => {
    const tokens = experienceToTokens(
      exp({ density: 'roomy', textSize: 'larger', motion: 'minimal' }),
    );
    expect(tokens['--simw-spacing-scale']).toBe('1.3');
    expect(tokens['--simw-font-scale']).toBe('1.125');
    expect(tokens['--simw-duration']).toBe('0ms');
  });

  it('applies to and clears from an element', () => {
    const el = document.documentElement;
    applyExperience(el, exp({ colorScheme: 'dark' }));
    expect(el.getAttribute('data-simw-color-scheme')).toBe('dark');
    expect(el.style.getPropertyValue('--simw-motion-scale')).toBe('1');
    expect(el.style.colorScheme).toBe('dark');
    clearExperience(el);
    expect(el.hasAttribute('data-simw-color-scheme')).toBe(false);
    expect(el.style.getPropertyValue('--simw-motion-scale')).toBe('');
  });
});

describe('policies', () => {
  it('only auto-advances with full motion and autoplay allowed', () => {
    expect(allowsAutoAdvance(exp())).toBe(true);
    const reduced = resolveExperience({
      native: { 'prefers-reduced-motion': 'reduce' },
    }).experience;
    expect(allowsAutoAdvance(reduced)).toBe(false);
    expect(transitionStyle(reduced)).toBe('fade');
  });

  it('stops visual-motion media under reduced or minimal motion, but not audio', () => {
    const video = { visualMotion: true };
    const audio = { visualMotion: false };
    for (const motion of ['reduced', 'minimal'] as const) {
      const calm = exp({ autoplay: 'allowed', motion });
      expect(autoplayMode(calm, video)).toBe('off');
      expect(autoplayMode(calm, audio)).toBe('play');
      expect(autoplayMode(calm, { visualMotion: true, essential: true })).toBe('play');
    }
    expect(autoplayMode(exp({ autoplay: 'allowed' }), video)).toBe('play');
  });

  it('follows the stated autoplay preference from a real resolution under OS reduced motion', () => {
    const { stated, experience } = resolveExperience({
      native: { 'prefers-reduced-motion': 'reduce' },
      passport: { autoplay: 'allowed' },
    });
    expect(stated.autoplay).toBe('allowed');
    expect(autoplayMode(experience, { visualMotion: true })).toBe('off');
    expect(autoplayMode(experience, { visualMotion: false })).toBe('play');
  });

  it('lets the autoplay preference cap everything, and mutes only what can be muted', () => {
    expect(autoplayMode(exp({ autoplay: 'never' }), { visualMotion: false })).toBe('off');
    expect(autoplayMode(exp({ autoplay: 'muted' }), { visualMotion: true })).toBe('play-muted');
    // Muted audio would be pointless.
    expect(autoplayMode(exp({ autoplay: 'muted' }), { visualMotion: false })).toBe('off');
  });

  it('holds back heavy media when data is reduced, without touching the preference', () => {
    const { experience } = resolveExperience({ native: { 'save-data': 'on' } });
    expect(experience.autoplay).toBe('allowed');
    expect(autoplayMode(experience, { visualMotion: true })).toBe('off');
    expect(autoplayMode(experience, { visualMotion: false })).toBe('off');
    expect(autoplayMode(experience, { visualMotion: false, heavy: false })).toBe('play');
    expect(allowsAutoAdvance(experience)).toBe(true);
  });

  it('adjusts columns for density without dropping below one', () => {
    expect(columnsFor(exp({ density: 'compact' }), 3)).toBe(4);
    expect(columnsFor(exp({ density: 'roomy' }), 1)).toBe(1);
  });

  it('keeps hover-only reveals off touch screens', () => {
    expect(revealsOnHover(exp())).toBe(true);
    expect(revealsOnHover(exp({ pointer: 'coarse', hover: false }))).toBe(false);
  });

  it('grows targets for touch and for larger controls', () => {
    expect(targetSize(exp())).toBe(36);
    expect(targetSize(exp({ pointer: 'coarse' }))).toBe(48);
    expect(targetSize(exp({ controls: 'larger' }))).toBe(56);
  });
});

describe('safe adapters', () => {
  it('injects motion rules that respect essential-motion opt-outs', () => {
    const adapters = installSafeAdapters(document, exp(), ['motion']);
    const style = document.head.querySelector('style[data-simw-adapter="motion"]');
    expect(style?.textContent).toBe(MOTION_CSS);
    expect(MOTION_CSS).toContain('data-simw-essential-motion');
    adapters.uninstall();
    expect(document.head.querySelector('style[data-simw-adapter]')).toBeNull();
  });

  it('stops autoplay when the visitor says never, including media added later', async () => {
    document.body.innerHTML =
      '<video autoplay></video><video></video><video autoplay data-simw-ignore></video>';
    const adapters = installSafeAdapters(document, exp({ autoplay: 'never' }), ['autoplay']);
    const [first, second, ignored] = Array.from(document.querySelectorAll('video'));
    expect(first?.autoplay).toBe(false);
    expect(first?.controls).toBe(true);
    expect(second?.controls).toBe(false);
    expect(ignored?.autoplay).toBe(true);

    const late = document.createElement('video');
    late.autoplay = true;
    document.body.appendChild(late);
    await new Promise((r) => setTimeout(r, 0));
    expect(late.autoplay).toBe(false);

    adapters.update(exp({ autoplay: 'allowed' }));
    expect(first?.autoplay).toBe(true);
    adapters.uninstall();
  });

  it('treats <video> as visual motion and <audio> as sound under reduced motion', () => {
    document.body.innerHTML =
      '<video autoplay></video><audio autoplay></audio><div data-simw-essential-motion><video autoplay></video></div>';
    const reduced = resolveExperience({
      native: { 'prefers-reduced-motion': 'reduce' },
      passport: { autoplay: 'allowed' },
    }).experience;
    const adapters = installSafeAdapters(document, reduced, ['autoplay']);
    const [video, essential] = Array.from(document.querySelectorAll('video'));
    const audio = document.querySelector('audio');
    expect(video?.autoplay).toBe(false);
    expect(audio?.autoplay).toBe(true);
    expect(essential?.autoplay).toBe(true);

    // Motion back to full: the visitor's own preference applies again.
    adapters.update(exp({ autoplay: 'allowed', motion: 'full' }));
    expect(video?.autoplay).toBe(true);
    adapters.uninstall();
  });

  it('fails closed: a broken adapter removes itself and reports', () => {
    const onError = vi.fn();
    const brokenDoc = {
      createElement: () => {
        throw new Error('boom');
      },
    } as unknown as Document;
    const adapters = installSafeAdapters(brokenDoc, exp(), ['motion'], onError);
    expect(adapters.active).toEqual([]);
    expect(onError).toHaveBeenCalledWith('motion', expect.any(Error));
  });
});
