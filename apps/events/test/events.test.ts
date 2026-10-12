import { env, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_EVENTS } from '../src/ingest';

const ORIGIN = 'https://seeitmyway.vercel.app';
const ENDPOINT = 'https://events.test/v1/events';

interface Row {
  day: string;
  name: string;
  props: string;
  count: number;
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return SELF.fetch(ENDPOINT, {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'text/plain;charset=UTF-8', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function rows(): Promise<Row[]> {
  const { results } = await env.DB.prepare(
    'SELECT day, name, props, count FROM event_counts ORDER BY name, props',
  ).all<Row>();
  return results;
}

beforeEach(async () => {
  await env.DB.exec('DELETE FROM event_counts');
});

describe('POST /v1/events', () => {
  it('stores per-day aggregates of allowlisted events, and nothing else', async () => {
    const response = await post({
      events: [
        { name: 'checkup_started', props: {} },
        { name: 'checkup_started', props: {} },
        { name: 'signals_detected', props: { count: 7 } },
        {
          name: 'awareness_answered',
          props: { answer: 'no', signal: 'prefers-reduced-motion', question: 'knew_where' },
        },
      ],
    });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');

    const today = new Date().toISOString().slice(0, 10);
    expect(await rows()).toEqual([
      {
        day: today,
        name: 'awareness_answered',
        props: '{"answer":"no","question":"knew_where","signal":"prefers-reduced-motion"}',
        count: 1,
      },
      { day: today, name: 'checkup_started', props: '{}', count: 2 },
      { day: today, name: 'signals_detected', props: '{"count":7}', count: 1 },
    ]);

    await post({ events: [{ name: 'checkup_started', props: {} }] });
    expect((await rows()).find((r) => r.name === 'checkup_started')?.count).toBe(3);
  });

  it('drops events outside the allowlist silently, without echoing input', async () => {
    const response = await post({
      events: [
        { name: 'page_view', props: { url: 'https://example.com/secret' } },
        { name: 'wishlist_suggested', props: { text: 'free text is never allowed' } },
        { name: 'signals_detected', props: { count: 9000 } },
        { name: 'passport_saved' },
      ],
    });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect((await rows()).map((r) => r.name)).toEqual(['passport_saved']);
  });

  it('stores nothing for a request carrying Sec-GPC: 1, and answers like any other request', async () => {
    const response = await post(
      { events: [{ name: 'checkup_started', props: {} }] },
      { 'Sec-GPC': '1' },
    );
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(await rows()).toEqual([]);
  });

  it('rejects malformed, oversized and over-long batches without storing anything', async () => {
    expect((await post('not json')).status).toBe(400);
    expect((await post({ nope: [] })).status).toBe(400);
    const tooMany = Array.from({ length: MAX_EVENTS + 1 }, () => ({
      name: 'checkup_started',
      props: {},
    }));
    expect((await post({ events: tooMany })).status).toBe(400);
    expect((await post({ events: [], padding: 'x'.repeat(9000) })).status).toBe(413);
    expect(await rows()).toEqual([]);
  });

  it('accepts only allowed origins, including the preview pattern', async () => {
    const preview = await post(
      { events: [{ name: 'recheck_clicked', props: {} }] },
      { Origin: 'https://seeitmyway-git-feature-x-simw.vercel.app' },
    );
    expect(preview.status).toBe(204);

    for (const origin of [
      'https://evil.example',
      'https://seeitmyway-a.b-simw.vercel.app',
      'https://seeitmyway.vercel.app.evil.example',
    ]) {
      const response = await post(
        { events: [{ name: 'checkup_started', props: {} }] },
        { Origin: origin },
      );
      expect(response.status).toBe(403);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    }
    const noOrigin = await SELF.fetch(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({ events: [{ name: 'checkup_started', props: {} }] }),
    });
    expect(noOrigin.status).toBe(403);
    expect((await rows()).map((r) => r.name)).toEqual(['recheck_clicked']);
  });

  it('answers CORS preflights with POST and OPTIONS only', async () => {
    const response = await SELF.fetch(ENDPOINT, {
      method: 'OPTIONS',
      headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST' },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect((await SELF.fetch(ENDPOINT, { headers: { Origin: ORIGIN } })).status).toBe(405);
  });

  it('rate-limits floods per address without storing the address', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      const response = await post(
        { events: [{ name: 'recheck_clicked', props: {} }] },
        { 'CF-Connecting-IP': '203.0.113.9' },
      );
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 30).every((s) => s === 204)).toBe(true);
    expect(statuses[30]).toBe(429);
    const stored = JSON.stringify(await rows());
    expect(stored).not.toContain('203.0.113.9');
    expect((await rows())[0]?.count).toBe(30);
  });

  it('keeps the schema to day, name, props and count', async () => {
    const { results } = await env.DB.prepare('PRAGMA table_info(event_counts)').all<{
      name: string;
    }>();
    expect(results.map((c) => c.name)).toEqual(['day', 'name', 'props', 'count']);
  });
});

describe('GET /v1/summary', () => {
  it('reports only cohorts of at least 50, with no subtotals to subtract from', async () => {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO event_counts VALUES ('2026-10-01', 'checkup_started', '{}', 40)"),
      env.DB.prepare("INSERT INTO event_counts VALUES ('2026-10-02', 'checkup_started', '{}', 30)"),
      env.DB.prepare(
        `INSERT INTO event_counts VALUES ('2026-10-02', 'preference_changed', '{"signal":"inverted-colors","to":"inverted"}', 3)`,
      ),
    ]);
    const response = await SELF.fetch('https://events.test/v1/summary');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      minimumCohort: 50,
      totals: { 'checkup_started {}': 70 },
      suppressedCells: 1,
      reportedTotal: 70,
    });
  });
});
