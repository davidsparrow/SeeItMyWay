import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EXPERIENCE, resolveExperience, type Experience } from '@simw/protocol';
import {
  MOTION_CSS,
  allowsAutoAdvance,
  autoplayMode,
  applyExperience,
  clearExperience,
  columnsFor,
  experienceToAttributes,
  experienceToTokens,
  installSafeAdapters,
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

  it('treats minimal motion as no autoplay', () => {
    expect(autoplayMode(exp({ autoplay: 'allowed', motion: 'minimal' }))).toBe('off');
    expect(autoplayMode(exp({ autoplay: 'muted' }))).toBe('play-muted');
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
