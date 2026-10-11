import { MINIMUM_COHORT, suppressSmallCohorts } from '@simw/privacy';
import type { Env } from './env';
import { aggregate, parseBatch, readCappedBody, utcDay } from './ingest';
import { originMatcher } from './origins';

/**
 * SeeItMyWay anonymous research counts.
 *
 * - `POST /v1/events` with `{ events: AnonymousEvent[] }` (at most 20).
 *   Every event goes through `sanitizeEvent`; anything outside the allowlist
 *   is dropped silently. Only per-day aggregates are written.
 * - `GET /v1/summary`: all-time totals with small cohorts suppressed.
 *
 * Nothing about the request itself is stored or logged: no IP, user agent,
 * referrer, country, cookie or request ID. Requests carrying `Sec-GPC: 1`
 * are discarded unread (SeeItMyWay's Global Privacy Control policy), with
 * the same 204 every accepted request gets.
 */

const EVENTS_PATH = '/v1/events';
const SUMMARY_PATH = '/v1/summary';

function empty(status: number, headers: HeadersInit = {}): Response {
  return new Response(null, { status, headers });
}

function corsHeaders(origin: string, methods: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function ingest(request: Request, env: Env, cors: HeadersInit): Promise<Response> {
  // GPC: discard without reading. Same status as success, so the response
  // doesn't reveal that the policy check happened.
  if (request.headers.get('Sec-GPC')?.trim() === '1') return empty(204, cors);

  if (env.RATE_LIMITER) {
    // An ephemeral per-address counter inside Cloudflare's rate limiter; the
    // address is never written to D1 or logged.
    const key = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.RATE_LIMITER.limit({ key });
    if (!success) return empty(429, cors);
  }

  const body = await readCappedBody(request);
  if (!body.ok) return empty(body.status, cors);
  const batch = parseBatch(body.text);
  if (!batch.ok) return empty(400, cors);

  const rows = aggregate(batch.events);
  if (rows.length > 0) {
    const day = utcDay();
    const upsert = env.DB.prepare(
      `INSERT INTO event_counts (day, name, props, count) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (day, name, props) DO UPDATE SET count = count + excluded.count`,
    );
    await env.DB.batch(rows.map((row) => upsert.bind(day, row.name, row.props, row.count)));
  }
  return empty(204, cors);
}

interface SummaryRow {
  name: string;
  props: string;
  count: number;
}

/**
 * All-time totals per (event, props), passed through `suppressSmallCohorts`.
 * Suppressed cells are left out entirely (only their number is reported),
 * and there are no per-event subtotals, so a small cohort can't be
 * recovered by subtraction.
 */
async function summary(env: Env, headers: HeadersInit): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT name, props, SUM(count) AS count FROM event_counts GROUP BY name, props',
  ).all<SummaryRow>();
  const counts: Record<string, number> = {};
  for (const row of results) counts[`${row.name} ${row.props}`] = row.count;
  const report = suppressSmallCohorts(counts, MINIMUM_COHORT);
  const totals: Record<string, number> = {};
  for (const [key, value] of Object.entries(report.counts)) {
    if (value !== null) totals[key] = value;
  }
  return Response.json(
    {
      minimumCohort: MINIMUM_COHORT,
      totals,
      suppressedCells: report.suppressed.length,
      reportedTotal: report.reportedTotal,
    },
    { headers: { ...headers, 'Cache-Control': 'public, max-age=300' } },
  );
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = originMatcher(env.ALLOWED_ORIGINS)(origin);

    if (pathname === EVENTS_PATH) {
      const cors = allowed && origin ? corsHeaders(origin, 'POST, OPTIONS') : {};
      if (request.method === 'OPTIONS') return empty(allowed ? 204 : 403, cors);
      if (request.method !== 'POST') return empty(405, { ...cors, Allow: 'POST, OPTIONS' });
      // Browsers always send Origin on these requests; anything else isn't our site.
      if (!allowed) return empty(403);
      return ingest(request, env, cors);
    }

    if (pathname === SUMMARY_PATH) {
      const cors = allowed && origin ? corsHeaders(origin, 'GET, OPTIONS') : {};
      if (request.method === 'OPTIONS') return empty(allowed ? 204 : 403, cors);
      if (request.method !== 'GET') return empty(405, { ...cors, Allow: 'GET, OPTIONS' });
      return summary(env, cors);
    }

    return empty(404);
  },
} satisfies ExportedHandler<Env>;
