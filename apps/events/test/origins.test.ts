import { describe, expect, it } from 'vitest';
import { originMatcher } from '../src/origins';

describe('originMatcher', () => {
  const allowed = originMatcher(
    ' https://seeitmyway.vercel.app/ , https://seeitmyway-*-team.vercel.app,http://localhost:3000',
  );

  it('matches exact origins and one-label wildcards', () => {
    expect(allowed('https://seeitmyway.vercel.app')).toBe(true);
    expect(allowed('https://SeeItMyWay.vercel.app')).toBe(true);
    expect(allowed('https://seeitmyway-abc123-team.vercel.app')).toBe(true);
    expect(allowed('http://localhost:3000')).toBe(true);
  });

  it('covers the shortened hostnames Vercel gives previews', () => {
    // Vercel cuts the project name in preview hostnames, so the documented pattern is `see-it-my-*`.
    const deployed = originMatcher(
      'https://see-it-my-way-navy.vercel.app,https://see-it-my-*-davids-projects-e32e946e.vercel.app',
    );
    expect(deployed('https://see-it-my-bpfp14re2-davids-projects-e32e946e.vercel.app')).toBe(true);
    expect(deployed('https://see-it-my-way-git-main-davids-projects-e32e946e.vercel.app')).toBe(
      true,
    );
    expect(deployed('https://see-it-my-x.vercel.app')).toBe(false);
    expect(deployed('https://see-it-my-x-davids-projects-e32e946e.evil.vercel.app')).toBe(false);
  });

  it('never lets a wildcard cross a dot, a scheme or a port', () => {
    expect(allowed('https://seeitmyway-a.evil-team.vercel.app')).toBe(false);
    expect(allowed('http://seeitmyway.vercel.app')).toBe(false);
    expect(allowed('http://localhost:3001')).toBe(false);
    expect(allowed('https://seeitmyway.vercel.app.evil.example')).toBe(false);
    expect(allowed(null)).toBe(false);
    expect(originMatcher('')('https://anything.example')).toBe(false);
  });
});
