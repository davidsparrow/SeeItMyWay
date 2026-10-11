import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXPERIENCE,
  DEFAULT_PREFERENCES,
  PREFERENCE_KEYS,
  VOCABULARY,
  createPacket,
  createSeed,
  isSeed,
  parsePacket,
  preferencePacketSchema,
  resolveExperience,
  seedToVariant,
} from './index';

describe('vocabulary', () => {
  it('keeps every value coarse: named buckets only, default included', () => {
    for (const key of PREFERENCE_KEYS) {
      const def = VOCABULARY[key];
      expect(def.values.length).toBeGreaterThanOrEqual(2);
      expect(def.values).toContain(def.default);
      for (const value of def.values) {
        expect(value).toMatch(/^[a-z][a-z-]*$/);
        expect((def.valueLabels as Record<string, string>)[value]).toBeTruthy();
      }
    }
  });

  it('stays intentionally small (PRD §36: 8–15 universal preferences)', () => {
    expect(PREFERENCE_KEYS.length).toBeGreaterThanOrEqual(8);
    expect(PREFERENCE_KEYS.length).toBeLessThanOrEqual(15);
  });
});

describe('resolveExperience precedence', () => {
  it('uses protocol defaults when nobody says anything', () => {
    const { experience, sources } = resolveExperience({ native: {} });
    expect(experience.motion).toBe('full');
    expect(experience.colorScheme).toBe('light');
    expect(sources.density).toBe('protocol-default');
    expect(DEFAULT_EXPERIENCE).toEqual(experience);
  });

  it('site override beats passport beats site default', () => {
    const { experience, sources } = resolveExperience({
      native: {},
      siteDefaults: { density: 'compact', detail: 'brief', visualRichness: 'rich' },
      passport: { density: 'roomy', detail: 'detailed' },
      siteOverrides: { density: 'standard' },
    });
    expect(experience.density).toBe('standard');
    expect(sources.density).toBe('site-override');
    expect(experience.detail).toBe('detailed');
    expect(sources.detail).toBe('passport');
    expect(experience.visualRichness).toBe('rich');
    expect(sources.visualRichness).toBe('site-default');
  });

  it('native reduced motion is a floor that later layers cannot loosen', () => {
    const { experience, sources } = resolveExperience({
      native: { 'prefers-reduced-motion': 'reduce' },
      siteOverrides: { motion: 'full', autoplay: 'allowed' },
    });
    expect(experience.motion).toBe('reduced');
    expect(sources.motion).toBe('native');
    expect(experience.autoplay).toBe('never');
    expect(sources.autoplay).toBe('native');
  });

  it('lets a visitor ask for even less motion than the OS floor', () => {
    const { experience, sources } = resolveExperience({
      native: { 'prefers-reduced-motion': 'reduce' },
      passport: { motion: 'minimal' },
    });
    expect(experience.motion).toBe('minimal');
    expect(sources.motion).toBe('passport');
  });

  it('save-data means no autoplay', () => {
    const { experience } = resolveExperience({ native: { 'save-data': 'on' } });
    expect(experience.data).toBe('reduced');
    expect(experience.autoplay).toBe('never');
  });

  it('system color scheme follows the device, explicit choice overrides it', () => {
    const native = { 'prefers-color-scheme': 'dark' } as const;
    expect(resolveExperience({ native }).experience.colorScheme).toBe('dark');
    expect(resolveExperience({ native }).sources.colorScheme).toBe('native');
    const explicit = resolveExperience({ native, siteOverrides: { colorScheme: 'light' } });
    expect(explicit.experience.colorScheme).toBe('light');
    expect(explicit.sources.colorScheme).toBe('site-override');
  });

  it('ignores out-of-vocabulary values from any layer', () => {
    const { experience } = resolveExperience({
      native: {},
      passport: { density: 'gigantic' as never },
    });
    expect(experience.density).toBe(DEFAULT_PREFERENCES.density);
  });

  it('maps native-only dimensions and keeps input capability out of preferences', () => {
    const { experience } = resolveExperience({
      native: {
        'prefers-contrast': 'more',
        'prefers-reduced-transparency': 'reduce',
        pointer: 'coarse',
        hover: 'none',
      },
    });
    expect(experience.contrast).toBe('more');
    expect(experience.transparency).toBe('reduced');
    expect(experience.pointer).toBe('coarse');
    expect(experience.hover).toBe(false);
    // Touch is an environment fact, not a request for larger controls.
    expect(experience.controls).toBe('standard');
  });
});

describe('experience seed', () => {
  it('creates anonymous hex seeds', () => {
    const seed = createSeed();
    expect(isSeed(seed)).toBe(true);
    expect(createSeed()).not.toBe(seed);
  });

  it('maps a seed to a stable variant', () => {
    expect(seedToVariant('0123456789abcdef', 4)).toBe(seedToVariant('0123456789abcdef', 4));
    expect(seedToVariant('0123456789abcdef', 4)).toBeGreaterThanOrEqual(0);
    expect(seedToVariant('0123456789abcdef', 4)).toBeLessThan(4);
  });

  it('never lets variation fight a contrast or forced-colors request', () => {
    const seed = '0123456789abcdef';
    expect(resolveExperience({ native: {}, seed, variants: 4 }).experience.variant).not.toBeNull();
    const contrast = resolveExperience({
      native: { 'prefers-contrast': 'more' },
      seed,
      variants: 4,
    });
    expect(contrast.experience.variant).toBeNull();
    expect(contrast.sources.variant).toBe('native');
    const forced = resolveExperience({ native: { 'forced-colors': 'active' }, seed, variants: 4 });
    expect(forced.experience.variant).toBeNull();
  });
});

describe('preference packet', () => {
  it('carries only vocabulary values', () => {
    const packet = createPacket({ motion: 'reduced', density: 'roomy' });
    expect(packet).toEqual({ version: '0.1', motion: 'reduced', density: 'roomy' });
  });

  it('drops unknown keys and invalid values from untrusted input', () => {
    const result = parsePacket({
      version: '0.1',
      motion: 'reduced',
      density: 22.7,
      userId: 'abc123',
      visitedSites: ['example.com'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet).toEqual({ version: '0.1', motion: 'reduced' });
    expect(result.dropped.sort()).toEqual(['density', 'userId', 'visitedSites']);
  });

  it('rejects other versions and non-objects', () => {
    expect(parsePacket({ version: '9' }).ok).toBe(false);
    expect(parsePacket(null).ok).toBe(false);
    expect(parsePacket([]).ok).toBe(false);
  });

  it('generates a JSON Schema that mirrors the vocabulary', () => {
    const schema = preferencePacketSchema() as { properties: Record<string, { enum?: string[] }> };
    for (const key of PREFERENCE_KEYS) {
      expect(schema.properties[key]?.enum).toEqual([...VOCABULARY[key].values]);
    }
  });
});
