import { resolveExperience } from '@simw/protocol';
import { describe, expect, it } from 'vitest';
import { constraintNote } from './constraints';

describe('constraintNote', () => {
  it('explains, without blocking, a Full motion choice on a reduced-motion device', () => {
    const r = resolveExperience({
      native: { 'prefers-reduced-motion': 'reduce' },
      passport: { motion: 'full', autoplay: 'allowed' },
    });
    expect(constraintNote('motion', r)).toBe(
      'Saved as Full. Your device is asking for reduced motion right now, so this site plays it calm. Your choice still applies on devices that don’t.',
    );
    expect(constraintNote('autoplay', r)).toMatch(
      /^Saved as Allowed\. .*Sound-only media can still start\./,
    );
  });

  it('says nothing when the choice applies as stated', () => {
    const r = resolveExperience({ native: {}, passport: { motion: 'full', autoplay: 'allowed' } });
    expect(constraintNote('motion', r)).toBeUndefined();
    expect(constraintNote('autoplay', r)).toBeUndefined();
    expect(constraintNote('density', r)).toBeUndefined();
  });

  it('explains forced colors overriding an explicit theme', () => {
    const r = resolveExperience({
      native: { 'forced-colors': 'active' },
      passport: { colorScheme: 'dark' },
    });
    expect(constraintNote('colorScheme', r, { lead: 'Set to' })).toMatch(
      /^Set to Dark\. Your device is using forced colors/,
    );
  });

  it('explains Save-Data holding back large media', () => {
    const r = resolveExperience({ native: { 'save-data': 'on' } });
    expect(constraintNote('autoplay', r)).toMatch(/save data, so large media waits/);
  });
});
