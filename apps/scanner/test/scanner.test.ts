import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { ScanError, type ScanRun, VARIANT_ORDER } from '@simw/scanner-core';
import { scanFacts } from '@simw/scanner-core/fixtures';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createApp,
  purgeExpired,
  REUSE_WINDOW_MS,
  type ScanDeps,
  type ScanEvent,
} from '../src/app';

const ORIGIN = 'https://seeitmyway.vercel.app';
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
let clock = Date.parse('2026-10-11T12:00:00Z');

/** A counting stand-in for a Workers Rate Limiting binding. */
function fakeLimiter(limit: number): RateLimit {
  const seen = new Map<string, number>();
  return {
    async limit({ key }) {
      const n = (seen.get(key) ?? 0) + 1;
      seen.set(key, n);
      return { success: n <= limit };
    },
  };
}

/** Bindings from wrangler.jsonc, with the real (time-windowed) rate limiters swapped out. */
let testEnv: Cloudflare.Env;

function fakeRun(url: string): ScanRun {
  return {
    facts: { ...scanFacts({}), url, finalUrl: url },
    screenshots: { baseline: JPEG, dark: JPEG },
  };
}

function setup(overrides: Partial<ScanDeps> = {}) {
  const scan = vi.fn<ScanDeps['scan']>(async (_env, url, onProgress) => {
    VARIANT_ORDER.forEach((variant, i) => {
      onProgress(variant, i + 1, VARIANT_ORDER.length);
    });
    return fakeRun(url);
  });
  const deps: ScanDeps = {
    scan,
    resolve: async () => ['93.184.216.34'],
    now: () => clock,
    ...overrides,
  };
  return { app: createApp(deps) as App, scan };
}

type App = ReturnType<typeof createApp> & Required<Pick<ReturnType<typeof createApp>, 'fetch'>>;

async function call(app: App, request: Request) {
  const ctx = createExecutionContext();
  const response = await app.fetch(
    request as Request<unknown, IncomingRequestCfProperties>,
    testEnv,
    ctx,
  );
  const body = await response.text();
  await waitOnExecutionContext(ctx);
  return { response, body };
}

function postScan(url: string, headers: Record<string, string> = {}) {
  return new Request('https://scanner.test/v1/scans', {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': `198.51.100.${Math.floor(Math.random() * 250)}`,
      ...headers,
    },
    body: JSON.stringify({ url }),
  });
}

const events = (body: string) =>
  body
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as ScanEvent);

beforeEach(async () => {
  testEnv = {
    ...env,
    SCAN_CLIENT_LIMITER: undefined,
    SCAN_TARGET_LIMITER: undefined,
    SCAN_GLOBAL_LIMITER: undefined,
  };
  clock += 2 * REUSE_WINDOW_MS;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM scan_reports'),
    env.DB.prepare('DELETE FROM scan_views'),
  ]);
});

describe('POST /v1/scans', () => {
  it('streams progress and a report, keeping only the normalized URL', async () => {
    const { app, scan } = setup();
    const { response, body } = await call(
      app,
      postScan('https://www.example.com/pricing?utm_source=x#plans'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/x-ndjson');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);

    const lines = events(body);
    expect(lines[0]).toEqual({
      type: 'accepted',
      url: 'https://www.example.com/pricing',
      stripped: { query: true, fragment: true },
    });
    expect(lines.filter((e) => e.type === 'progress')).toHaveLength(5);
    const last = lines.at(-1);
    expect(last?.type).toBe('report');
    if (last?.type !== 'report') return;
    expect(scan).toHaveBeenCalledWith(
      testEnv,
      'https://www.example.com/pricing',
      expect.any(Function),
    );
    expect(last.report.url).toBe('https://www.example.com/pricing');
    expect(last.report.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(last.report.notes.join(' ')).toMatch(/removed the query string/);
    expect(last.report.views.map((v) => v.variant)).toEqual(['baseline', 'dark']);
    expect(Date.parse(last.report.expiresAt) - clock).toBe(30 * 24 * 60 * 60 * 1000);
    expect(JSON.stringify(last.report)).not.toContain('utm_source');

    const stored = await call(
      app,
      new Request(`https://scanner.test/v1/reports/${last.report.id}`, {
        headers: { Origin: ORIGIN },
      }),
    );
    expect(stored.response.status).toBe(200);
    expect(JSON.parse(stored.body)).toEqual(last.report);

    const view = await call(
      app,
      new Request(`https://scanner.test/v1/reports/${last.report.id}/views/dark`),
    );
    expect(view.response.status).toBe(200);
    expect(view.response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(
      (
        await call(
          app,
          new Request(`https://scanner.test/v1/reports/${last.report.id}/views/forced-colors`),
        )
      ).response.status,
    ).toBe(404);
  });

  it('stores the report and its URL, and nothing about who asked', async () => {
    const { app } = setup();
    await call(app, postScan('https://example.org/'));
    const { results } = await env.DB.prepare('PRAGMA table_info(scan_reports)').all<{
      name: string;
    }>();
    expect(results.map((c) => c.name)).toEqual(['id', 'url', 'created_at', 'expires_at', 'report']);
    const row = await env.DB.prepare('SELECT * FROM scan_reports').first<Record<string, unknown>>();
    expect(JSON.stringify(row)).not.toMatch(/198\.51\.100|Mozilla|seeitmyway\.vercel\.app/);
  });

  it.each([
    ['http://127.0.0.1/', 'ip-literal'],
    ['http://localhost:3000/', 'port'],
    ['http://router.local/', 'internal-host'],
    ['ftp://example.com/', 'scheme'],
    ['', 'invalid'],
  ])('refuses %s before any browser starts (%s)', async (url, error) => {
    const { app, scan } = setup();
    const { response, body } = await call(app, postScan(url));
    expect(response.status).toBe(400);
    expect(JSON.parse(body)).toMatchObject({ error });
    expect(scan).not.toHaveBeenCalled();
  });

  it('refuses names that resolve to private addresses, or to nothing', async () => {
    for (const [addresses, error] of [
      [['93.184.216.34', '10.0.0.7'], 'private-address'],
      [['169.254.169.254'], 'private-address'],
      [['::ffff:127.0.0.1'], 'private-address'],
      [[], 'unresolvable'],
    ] as const) {
      const { app, scan } = setup({ resolve: async () => [...addresses] });
      const { response, body } = await call(app, postScan(`https://rebind-${error}.example.com/`));
      expect(response.status).toBe(400);
      expect(JSON.parse(body)).toMatchObject({ error });
      expect(scan).not.toHaveBeenCalled();
    }
  });

  it('answers a repeat scan within ten minutes from storage, without a browser', async () => {
    const { app, scan } = setup();
    const first = events((await call(app, postScan('https://example.net/'))).body).at(-1);
    clock += 60_000;
    const second = events((await call(app, postScan('https://example.net/?again=1'))).body).at(-1);
    expect(scan).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({ type: 'report', reused: true });
    if (first?.type === 'report' && second?.type === 'report')
      expect(second.report.id).toBe(first.report.id);
  });

  it('reports scan failures in the stream and stores nothing', async () => {
    const { app } = setup({
      scan: async () => {
        throw new ScanError('http-status', 'The page answered with HTTP 404.', 404);
      },
    });
    const lines = events((await call(app, postScan('https://example.com/missing'))).body);
    expect(lines.at(-1)).toEqual({
      type: 'error',
      error: 'http-status',
      message: 'The page answered with HTTP 404.',
    });
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM scan_reports').first('n')).toBe(0);

    const crashed = setup({ scan: async () => Promise.reject(new Error('browser exploded')) });
    const crash = events((await call(crashed.app, postScan('https://example.com/boom'))).body).at(
      -1,
    );
    expect(crash).toMatchObject({ type: 'error', error: 'scan-failed' });
    expect(JSON.stringify(crash)).not.toContain('exploded');
  });

  it('rate-limits per requester, per target site and globally', async () => {
    const { app, scan } = setup();
    testEnv.SCAN_TARGET_LIMITER = fakeLimiter(2);
    const statuses: number[] = [];
    for (const path of ['a', 'b', 'c']) {
      statuses.push(
        (await call(app, postScan(`https://busy.example.com/${path}`))).response.status,
      );
    }
    expect(statuses).toEqual([200, 200, 429]);

    testEnv.SCAN_TARGET_LIMITER = undefined;
    testEnv.SCAN_GLOBAL_LIMITER = fakeLimiter(0);
    const global = await call(app, postScan('https://quiet.example.com/'));
    expect(global.response.status).toBe(429);
    expect(global.response.headers.get('Retry-After')).toBe('60');

    testEnv.SCAN_GLOBAL_LIMITER = undefined;
    testEnv.SCAN_CLIENT_LIMITER = fakeLimiter(1);
    const ip = { 'CF-Connecting-IP': '203.0.113.50' };
    expect((await call(app, postScan('https://one.example.com/', ip))).response.status).toBe(200);
    expect((await call(app, postScan('https://two.example.com/', ip))).response.status).toBe(429);
    expect(scan).toHaveBeenCalledTimes(3);
  });

  it('accepts requests only from allowed origins', async () => {
    const { app, scan } = setup();
    const evil = await call(
      app,
      postScan('https://example.com/', { Origin: 'https://evil.example' }),
    );
    expect(evil.response.status).toBe(403);
    expect(evil.response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(scan).not.toHaveBeenCalled();
    const preflight = await call(
      app,
      new Request('https://scanner.test/v1/scans', {
        method: 'OPTIONS',
        headers: { Origin: ORIGIN },
      }),
    );
    expect(preflight.response.status).toBe(204);
    expect(preflight.response.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, POST, OPTIONS',
    );
  });
});

describe('retention', () => {
  it('deletes expired reports and screenshots, and stops serving them', async () => {
    const { app } = setup();
    const report = events((await call(app, postScan('https://old.example.com/'))).body).at(-1);
    if (report?.type !== 'report') throw new Error('no report');
    const id = report.report.id;

    clock += 25 * 60 * 60 * 1000; // past the 24 h screenshot lifetime
    expect(
      (await call(app, new Request(`https://scanner.test/v1/reports/${id}/views/baseline`)))
        .response.status,
    ).toBe(404);
    await purgeExpired(env, clock);
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM scan_views').first('n')).toBe(0);
    expect(
      (await call(app, new Request(`https://scanner.test/v1/reports/${id}`))).response.status,
    ).toBe(200);

    clock += 30 * 24 * 60 * 60 * 1000; // past the 30-day report lifetime
    await purgeExpired(env, clock);
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM scan_reports').first('n')).toBe(0);
    expect(
      (await call(app, new Request(`https://scanner.test/v1/reports/${id}`))).response.status,
    ).toBe(404);
  });
});
