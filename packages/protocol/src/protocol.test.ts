import { describe, expect, it } from 'vitest';
import {
  constraintsAffecting,
  createPacket,
  createSeed,
  DEFAULT_EXPERIENCE,
  DEFAULT_PREFERENCES,
  isSeed,
  PREFERENCE_KEYS,
  parsePacket,
  preferencePacketSchema,
  resolveExperience,
  seedToVariant,
  VOCABULARY,
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

  it('native reduced motion is a floor on effective motion, not on what was stated', () => {
    const { stated, statedSources, experience, sources, constraints } = resolveExperience({
      native: { 'prefers-reduced-motion': 'reduce' },
      siteOverrides: { motion: 'full' },
    });
    expect(stated.motion).toBe('full');
    expect(statedSources.motion).toBe('site-override');
    expect(experience.motion).toBe('reduced');
    expect(sources.motion).toBe('native');
    expect(constraints.map((c) => c.id)).toEqual(['os-reduced-motion']);
  });

  it('never rewrites autoplay: reduced motion is reported as a constraint instead', () => {
    const { stated, statedSources, experience, sources, constraints } = resolveExperience({
      native: { 'prefers-reduced-motion': 'reduce' },
      passport: { autoplay: 'allowed' },
    });
    expect(stated.autoplay).toBe('allowed');
    expect(statedSources.autoplay).toBe('passport');
    expect(experience.autoplay).toBe('allowed');
    expect(sources.autoplay).toBe('passport');
    expect(constraintsAffecting(constraints, 'autoplay').map((c) => c.id)).toEqual([
      'os-reduced-motion',
    ]);
    expect(constraints[0]?.reason).toMatch(/reduced motion/);
  });

  it('lets a visitor ask for even less motion than the OS floor', () => {
    const { experience, sources } = resolveExperience({
      native: { 'prefers-reduced-motion': 'reduce' },
      passport: { motion: 'minimal' },
    });
    expect(experience.motion).toBe('minimal');
    expect(sources.motion).toBe('passport');
  });

  it('save-data and reduced data reduce effective data use without rewriting autoplay', () => {
    const saveData = resolveExperience({
      native: { 'save-data': 'on' },
      passport: { autoplay: 'allowed' },
    });
    expect(saveData.experience.data).toBe('reduced');
    expect(saveData.experience.autoplay).toBe('allowed');
    expect(saveData.stated.autoplay).toBe('allowed');
    expect(saveData.constraints.map((c) => c.id)).toEqual(['save-data']);

    const reducedData = resolveExperience({ native: { 'prefers-reduced-data': 'reduce' } });
    expect(reducedData.experience.data).toBe('reduced');
    expect(reducedData.experience.autoplay).toBe('allowed');
    expect(reducedData.constraints.map((c) => c.id)).toEqual(['reduced-data']);
  });

  it('reports no constraints when the device asks for nothing', () => {
    const { constraints, stated, experience } = resolveExperience({
      native: { 'prefers-color-scheme': 'dark', 'prefers-reduced-motion': 'no-preference' },
      passport: { motion: 'full' },
    });
    expect(constraints).toEqual([]);
    expect(experience.motion).toBe(stated.motion);
  });

  it('forced colors override an explicit theme; the stated theme stays as chosen', () => {
    const forced = resolveExperience({
      native: { 'forced-colors': 'active', 'prefers-color-scheme': 'light' },
      passport: { colorScheme: 'dark' },
      seed: '0123456789abcdef',
      variants: 4,
    });
    expect(forced.stated.colorScheme).toBe('dark');
    expect(forced.statedSources.colorScheme).toBe('passport');
    expect(forced.experience.colorScheme).toBe('light');
    expect(forced.sources.colorScheme).toBe('native');
    expect(forced.experience.forcedColors).toBe(true);
    expect(forced.experience.transparency).toBe('reduced');
    expect(forced.experience.variant).toBeNull();
    expect(forced.constraints.map((c) => c.id)).toEqual(['forced-colors']);
    expect(constraintsAffecting(forced.constraints, 'colorScheme')).toHaveLength(1);

    const darkCanvas = resolveExperience({
      native: { 'forced-colors': 'active', 'prefers-color-scheme': 'dark' },
      siteOverrides: { colorScheme: 'light' },
    });
    expect(darkCanvas.experience.colorScheme).toBe('dark');
    expect(darkCanvas.stated.colorScheme).toBe('light');
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
