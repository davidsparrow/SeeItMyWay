import { describe, expect, it } from 'vitest';
import { INSTRUCTIONS } from './instructions';

const sets = Object.entries(INSTRUCTIONS).flatMap(([topic, list]) =>
  (list ?? []).map((set) => ({ topic, set })),
);

describe('INSTRUCTIONS', () => {
  it('names a primary source for every set marked verified', () => {
    for (const { topic, set } of sets) {
      if (set.verified === 'needs-review') continue;
      expect(set.source, `${topic}/${set.platform}`).toMatch(/^https:\/\//);
    }
  });

  it('offers each platform at most once per topic', () => {
    for (const [topic, list] of Object.entries(INSTRUCTIONS)) {
      const platforms = (list ?? []).map((set) => set.platform);
      expect(new Set(platforms).size, topic).toBe(platforms.length);
    }
  });
});
