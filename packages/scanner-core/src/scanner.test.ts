import { describe, expect, it } from 'vitest';
import { analyze, buildReport, RUBRIC, zeroCounts } from './analyze';
import { pageFacts, scanFacts } from './fixtures';
import type { Check, CheckId, PageFacts } from './types';
import { hostRejection, isPrivateAddress, normalizeScanUrl, requestRejection } from './url';

const byId = (checks: Check[]) =>
  Object.fromEntries(checks.map((c) => [c.id, c])) as Record<CheckId, Check>;

const counts = (overrides: Partial<ReturnType<typeof zeroCounts>>) => ({
  ...zeroCounts(),
  ...overrides,
});

describe('normalizeScanUrl', () => {
  it('keeps only origin and path, and says what it removed', () => {
    expect(normalizeScanUrl(' Example.COM/shop/?utm=1#top ')).toEqual({
      ok: true,
      url: 'https://example.com/shop/',
      hostname: 'example.com',
      stripped: { query: true, fragment: true },
    });
    expect(normalizeScanUrl('http://example.com')).toMatchObject({
      ok: true,
      url: 'http://example.com/',
      stripped: { query: false, fragment: false },
    });
  });

  it.each([
    ['ftp://example.com/', 'scheme'],
    ['javascript:alert(1)', 'scheme'],
    ['file:///etc/passwd', 'scheme'],
    ['https://user:pass@example.com/', 'credentials'],
    ['https://example.com:8080/', 'port'],
    ['https://127.0.0.1/', 'ip-literal'],
    ['http://2130706433/', 'ip-literal'],
    ['http://0x7f.1/', 'ip-literal'],
    ['http://[::1]/', 'ip-literal'],
    ['http://169.254.169.254/latest/meta-data/', 'ip-literal'],
    ['http://localhost/', 'internal-host'],
    ['http://intranet/', 'internal-host'],
    ['http://printer.local/', 'internal-host'],
    ['http://db.internal/', 'internal-host'],
    ['http://router.home.arpa/', 'internal-host'],
    ['http://foo.localhost./', 'internal-host'],
    ['not a url at all', 'invalid'],
    ['', 'invalid'],
  ])('rejects %s (%s)', (input, reason) => {
    expect(normalizeScanUrl(input)).toEqual({ ok: false, reason });
  });

  it('refuses absurdly long addresses', () => {
    expect(normalizeScanUrl(`https://example.com/${'a'.repeat(3000)}`)).toEqual({
      ok: false,
      reason: 'too-long',
    });
  });
});

describe('request guards', () => {
  it('lets the page load public resources and data URLs only', () => {
    expect(requestRejection('https://cdn.example.net/app.css')).toBeNull();
    expect(requestRejection('data:image/png;base64,AAAA')).toBeNull();
    expect(requestRejection('http://10.0.0.5/admin')).toBe('ip-literal');
    expect(requestRejection('https://example.net:8443/x.js')).toBe('port');
    expect(requestRejection('ws://example.net/socket')).toBe('scheme');
    expect(hostRejection('metadata.google.internal')).toBe('internal-host');
  });

  it.each([
    '10.1.2.3',
    '127.0.0.1',
    '0.0.0.0',
    '100.64.0.1',
    '169.254.169.254',
    '172.16.5.4',
    '172.31.255.255',
    '192.168.1.1',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1%eth0',
    'ff02::1',
    '2001:db8::1',
    '::ffff:10.0.0.1',
    '::ffff:7f00:1',
    '64:ff9b::a9fe:a9fe',
    'not-an-ip',
  ])('treats %s as private', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each(['93.184.216.34', '172.32.0.1', '8.8.8.8', '2606:4700:4700::1111', '::ffff:8.8.8.8'])(
    'treats %s as public',
    (ip) => {
      expect(isPrivateAddress(ip)).toBe(false);
    },
  );
});

describe('analyze', () => {
  const listening: Partial<PageFacts> = {
    css: {
      features: counts({
        'prefers-reduced-motion': 2,
        'prefers-color-scheme': 1,
        'forced-colors': 1,
      }),
      lightDark: 0,
      readableSheets: 2,
      unreadableHrefs: [],
      hoverRevealRules: 0,
    },
  };

  it('scores a page that listens to everything 100', () => {
    const base = pageFacts({
      ...listening,
      animations: { running: 2, infinite: 2 },
      media: [
        {
          kind: 'video',
          autoplay: true,
          playing: true,
          muted: true,
          area: 400_000,
          inFirstViewport: true,
        },
      ],
      carousel: { candidates: 1, advances: 1 },
    });
    const facts = scanFacts({
      baseline: base,
      'reduced-motion': pageFacts({
        ...listening,
        media: [
          {
            kind: 'video',
            autoplay: false,
            playing: false,
            muted: true,
            area: 400_000,
            inFirstViewport: true,
          },
        ],
        carousel: { candidates: 1, advances: 0 },
      }),
      dark: pageFacts({
        colors: { background: [13, 14, 19], text: [240, 240, 240], signature: ['dark'] },
      }),
      'more-contrast': pageFacts({
        colors: {
          ...base.colors,
          text: [0, 0, 0],
          signature: base.colors.signature.map((s) => `${s}!`),
        },
      }),
    });
    const { checks, score } = analyze(facts);
    expect(checks.every((c) => c.status === 'pass')).toBe(true);
    expect(score).toBe(100);
    const c = byId(checks);
    expect(c['color-scheme'].title).toBe('Dark mode respected');
    expect(c['reduced-motion-media'].title).toBe('Video waits for reduced-motion visitors');
    expect(c.carousel.title).toBe('Carousel waits for reduced-motion visitors');
  });

  it('finds the PRD example failures on a page that ignores preferences', () => {
    const hero = {
      kind: 'video' as const,
      autoplay: true,
      playing: true,
      muted: true,
      area: 600_000,
      inFirstViewport: true,
    };
    const page = pageFacts({
      animations: { running: 3, infinite: 3 },
      media: [hero],
      carousel: { candidates: 1, advances: 2 },
    });
    const { checks, score } = analyze(scanFacts({ baseline: page }));
    const c = byId(checks);
    expect(c['color-scheme']).toMatchObject({
      status: 'fail',
      title: 'Dark mode preference not supported',
    });
    expect(c.contrast).toMatchObject({
      status: 'fail',
      title: 'Contrast preference not supported',
    });
    expect(c['reduced-motion-media']).toMatchObject({
      status: 'fail',
      title: 'Hero video ignores motion preference',
    });
    expect(c.carousel).toMatchObject({ status: 'fail', title: 'Carousel automatically advances' });
    expect(c['reduced-motion-animation'].status).toBe('fail');
    expect(c.viewport).toMatchObject({ status: 'pass', title: 'Touch layout responsive' });
    expect(score).toBe(
      RUBRIC.viewport +
        RUBRIC.hover +
        RUBRIC['audio-autoplay'] +
        Math.floor(RUBRIC['forced-colors'] / 2),
    );
  });

  it('gives partial credit where the evidence is partial', () => {
    const base = pageFacts({
      css: { ...pageFacts().css, features: counts({ 'prefers-contrast': 1 }), hoverRevealRules: 3 },
      animations: { running: 4, infinite: 4 },
      media: [
        {
          kind: 'audio',
          autoplay: true,
          playing: false,
          muted: false,
          area: 0,
          inFirstViewport: false,
        },
      ],
    });
    const c = byId(
      analyze(
        scanFacts({
          baseline: base,
          'reduced-motion': pageFacts({ animations: { running: 1, infinite: 1 } }),
          dark: pageFacts({
            colors: {
              ...base.colors,
              signature: base.colors.signature.map((s, i) => (i < 20 ? `${s}~` : s)),
            },
          }),
        }),
      ).checks,
    );
    expect(c['reduced-motion-animation']).toMatchObject({
      status: 'partial',
      title: 'Reduced motion partially supported',
      earned: 5,
    });
    expect(c['color-scheme']).toMatchObject({
      status: 'partial',
      title: 'Dark mode partially supported',
    });
    expect(c.contrast).toMatchObject({ status: 'partial', earned: 7 });
    expect(c.hover).toMatchObject({
      status: 'partial',
      title: 'Possible hover-only content',
      possible: true,
    });
    expect(c['audio-autoplay']).toMatchObject({
      status: 'partial',
      title: 'Sound may start on its own',
    });
  });

  it('counts script queries and fetched cross-origin CSS as listening', () => {
    const facts = scanFacts({
      baseline: pageFacts({ queried: counts({ 'prefers-reduced-motion': 1, 'forced-colors': 1 }) }),
    });
    const c = byId(analyze(facts).checks);
    expect(c['reduced-motion-listens'].status).toBe('pass');
    expect(c['forced-colors'].status).toBe('pass');

    const external = scanFacts({});
    external.externalCss['prefers-reduced-motion'] = 1;
    expect(byId(analyze(external).checks)['reduced-motion-listens'].status).toBe('pass');
  });

  it('calls an always-dark page "dark by default"', () => {
    const dark = pageFacts({
      colors: { background: [10, 10, 10], text: [230, 230, 230], signature: [] },
    });
    expect(byId(analyze(scanFacts({ baseline: dark })).checks)['color-scheme'].title).toBe(
      'Dark by default',
    );
  });

  it('is deterministic and the rubric adds up to 100', () => {
    const facts = scanFacts({});
    expect(analyze(facts)).toEqual(analyze(structuredClone(facts)));
    expect(Object.values(RUBRIC).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('buildReport', () => {
  it('keeps only the normalized URL and notes stripping and unreadable sheets', () => {
    const facts = { ...scanFacts({}), unreadableSheets: 2 };
    const report = buildReport(facts, {
      id: 'abc',
      scannedAt: new Date('2026-10-11T00:00:00Z'),
      expiresAt: new Date('2026-11-10T00:00:00Z'),
      views: [],
      viewsExpireAt: null,
      stripped: { query: true, fragment: false },
    });
    expect(report.url).toBe('https://example.com/');
    expect(report.rubricVersion).toBe('1');
    expect(report.notes.join(' ')).toMatch(/removed the query string/);
    expect(report.notes.join(' ')).toMatch(/2 stylesheets couldn’t be read/);
    expect(report.notes[0]).toMatch(/not an accessibility audit/);
  });
});
