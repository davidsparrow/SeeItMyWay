import { describe, expect, it } from 'vitest';
import {
  buildResultCardItems,
  filterForSharing,
  sanitizeEvent,
  suppressSmallCohorts,
} from './index';

describe('filterForSharing', () => {
  it('shares universal preferences as a versioned packet', () => {
    expect(filterForSharing({ motion: 'reduced', autoplay: 'never' })).toEqual({
      version: '0.1',
      motion: 'reduced',
      autoplay: 'never',
    });
  });

  it('never passes through anything outside the vocabulary', () => {
    const packet = filterForSharing({
      motion: 'reduced',
      density: 'enormous',
      trackingId: 'xyz',
    } as never);
    expect(packet).toEqual({ version: '0.1', motion: 'reduced' });
  });
});

describe('buildResultCardItems', () => {
  it('includes only what the visitor chose, in vocabulary order', () => {
    const profile = { motion: 'reduced', density: 'roomy', colorScheme: 'dark' } as const;
    expect(buildResultCardItems(profile, ['density', 'colorScheme'])).toEqual([
      { key: 'colorScheme', value: 'dark' },
      { key: 'density', value: 'roomy' },
    ]);
  });

  it('includes nothing by default', () => {
    expect(buildResultCardItems({ motion: 'reduced' }, [])).toEqual([]);
  });
});

describe('suppressSmallCohorts', () => {
  it('hides small counts and leaves them out of the total', () => {
    const report = suppressSmallCohorts({ roomy: 120, compact: 7, standard: 300 }, 50);
    expect(report.counts).toEqual({ roomy: 120, compact: null, standard: 300 });
    expect(report.suppressed).toEqual(['compact']);
    expect(report.reportedTotal).toBe(420);
  });
});

describe('sanitizeEvent', () => {
  it('accepts allowlisted events with closed-enum props', () => {
    expect(sanitizeEvent('checkup_started')).toEqual({ name: 'checkup_started', props: {} });
    expect(
      sanitizeEvent('preference_changed', { signal: 'prefers-reduced-motion', to: 'reduce' }),
    ).toEqual({
      name: 'preference_changed',
      props: { signal: 'prefers-reduced-motion', to: 'reduce' },
    });
  });

  it('rejects unknown events, extra props, free text and out-of-range numbers', () => {
    expect(sanitizeEvent('page_view', {})).toBeNull();
    expect(sanitizeEvent('checkup_started', { url: 'https://example.com' })).toBeNull();
    expect(sanitizeEvent('wishlist_voted', { item: 'please add a dog mode' })).toBeNull();
    expect(sanitizeEvent('signals_detected', { count: 400 })).toBeNull();
    expect(sanitizeEvent('signals_detected', { count: 2.5 })).toBeNull();
    expect(sanitizeEvent('demo_viewed', {})).toBeNull();
  });
});
