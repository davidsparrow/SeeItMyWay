import {
  buildReport,
  isPrivateAddress,
  normalizeScanUrl,
  type ReportView,
  ScanError,
  type ScanReport,
  type ScanRun,
  URL_REJECTION_MESSAGES,
  VARIANT_ORDER,
  VARIANTS,
  type Variant,
} from '@simw/scanner-core';
import type { Env } from './env';
import { originMatcher } from './origins';

/**
 * The Site Listener Test API.
 *
 * - `POST /v1/scans` `{ "url": "…" }` → an NDJSON stream: `accepted`, one
 *   `progress` line per emulated load, then `report` (or `error`).
 * - `GET /v1/reports/:id` → a stored report.
 * - `GET /v1/reports/:id/views/:variant` → a short-lived JPEG of one load.
 * - A daily cron deletes expired reports and screenshots.
 *
 * One public page per scan, no crawling. Nothing about the requester is
 * stored: no IP, user agent or cookie, only the report and the page's URL.
 */

export interface ScanDeps {
  /** Runs the browser part of a scan. The real one uses Browser Run. */
  scan(
    env: Env,
    url: string,
    onProgress: (variant: Variant, done: number, total: number) => void,
  ): Promise<ScanRun>;
  /** A and AAAA records for a hostname. */
  resolve(hostname: string): Promise<string[]>;
  now(): number;
}

/** A scan of the same URL this recent is answered from storage instead of a new browser. */
export const REUSE_WINDOW_MS = 10 * 60 * 1000;
export const SCAN_TIMEOUT_MS = 55_000;
const MAX_BODY = 4 * 1024;
const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export type ScanEvent =
  | { type: 'accepted'; url: string; stripped: { query: boolean; fragment: boolean } }
  | { type: 'progress'; variant: Variant; done: number; total: number }
  | { type: 'report'; report: ScanReport; reused: boolean }
  | { type: 'error'; error: string; message: string };

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function cors(origin: string | null, allowed: boolean): Record<string, string> {
  if (!allowed || !origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return Response.json(body, {
    status,
    headers: { ...headers, 'Cache-Control': 'no-store' },
  });
}

function problem(error: string, message: string, status: number, headers: Record<string, string>) {
  return json({ error, message }, status, headers);
}

const positiveNumber = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

async function limited(limiter: RateLimit | undefined, key: string): Promise<boolean> {
  if (!limiter) return false;
  const { success } = await limiter.limit({ key });
  return !success;
}

async function readUrl(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > MAX_BODY) return null;
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  try {
    const body = JSON.parse(text) as { url?: unknown };
    return typeof body.url === 'string' ? body.url : null;
  } catch {
    return null;
  }
}

async function recentReport(env: Env, url: string, now: number): Promise<ScanReport | null> {
  const row = await env.DB.prepare(
    'SELECT report FROM scan_reports WHERE url = ?1 AND created_at > ?2 AND expires_at > ?3 ORDER BY created_at DESC LIMIT 1',
  )
    .bind(url, now - REUSE_WINDOW_MS, now)
    .first<{ report: string }>();
  return row ? (JSON.parse(row.report) as ScanReport) : null;
}

async function store(
  env: Env,
  report: ScanReport,
  createdAt: number,
  run: ScanRun,
  viewsExpireAt: number,
): Promise<void> {
  const statements = [
    env.DB.prepare(
      'INSERT INTO scan_reports (id, url, created_at, expires_at, report) VALUES (?1, ?2, ?3, ?4, ?5)',
    ).bind(report.id, report.url, createdAt, Date.parse(report.expiresAt), JSON.stringify(report)),
  ];
  for (const view of report.views) {
    const image = run.screenshots[view.variant];
    if (!image) continue;
    statements.push(
      env.DB.prepare(
        'INSERT INTO scan_views (report_id, variant, image, expires_at) VALUES (?1, ?2, ?3, ?4)',
      ).bind(report.id, view.variant, image, viewsExpireAt),
    );
  }
  await env.DB.batch(statements);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function startScan(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  deps: ScanDeps,
  headers: Record<string, string>,
): Promise<Response> {
  const input = await readUrl(request);
  if (input === null) return problem('invalid', URL_REJECTION_MESSAGES.invalid, 400, headers);
  const normalized = normalizeScanUrl(input);
  if (!normalized.ok) {
    return problem(normalized.reason, URL_REJECTION_MESSAGES[normalized.reason], 400, headers);
  }

  const busy = (scope: string) =>
    problem(
      'rate-limited',
      scope === 'target'
        ? 'That site was tested very recently. Try again in a minute.'
        : 'The Site Listener Test is busy. Try again in a minute.',
      429,
      { ...headers, 'Retry-After': '60' },
    );
  // An ephemeral per-address counter; the address is never stored or logged.
  if (
    await limited(env.SCAN_CLIENT_LIMITER, request.headers.get('CF-Connecting-IP') ?? 'unknown')
  ) {
    return busy('client');
  }

  const now = deps.now();
  const reused = await recentReport(env, normalized.url, now);
  if (!reused) {
    if (await limited(env.SCAN_TARGET_LIMITER, normalized.hostname)) return busy('target');
    if (await limited(env.SCAN_GLOBAL_LIMITER, 'global')) return busy('global');

    let addresses: string[];
    try {
      addresses = await deps.resolve(normalized.hostname);
    } catch {
      addresses = [];
    }
    if (addresses.length === 0) {
      return problem('unresolvable', URL_REJECTION_MESSAGES.unresolvable, 400, headers);
    }
    if (addresses.some(isPrivateAddress)) {
      return problem('private-address', URL_REJECTION_MESSAGES['private-address'], 400, headers);
    }
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const send = (event: ScanEvent) => writer.write(encoder.encode(`${JSON.stringify(event)}\n`));

  const work = (async () => {
    try {
      await send({ type: 'accepted', url: normalized.url, stripped: normalized.stripped });
      if (reused) {
        await send({ type: 'report', report: reused, reused: true });
        return;
      }
      const run = await withTimeout(
        deps.scan(env, normalized.url, (variant, done, total) => {
          void send({ type: 'progress', variant, done, total });
        }),
        SCAN_TIMEOUT_MS,
      );
      const createdAt = deps.now();
      const reportTtl = positiveNumber(env.REPORT_TTL_DAYS, 30) * 24 * 60 * 60 * 1000;
      const viewsTtl = positiveNumber(env.VIEWS_TTL_HOURS, 24) * 60 * 60 * 1000;
      const views: ReportView[] = VARIANT_ORDER.filter((v) => run.screenshots[v]).map(
        (variant) => ({ variant, label: VARIANTS[variant].label }),
      );
      const report = buildReport(run.facts, {
        id: randomId(),
        scannedAt: new Date(createdAt),
        expiresAt: new Date(createdAt + reportTtl),
        views,
        viewsExpireAt: views.length ? new Date(createdAt + viewsTtl) : null,
        stripped: normalized.stripped,
      });
      await store(env, report, createdAt, run, createdAt + viewsTtl);
      await send({ type: 'report', report, reused: false });
    } catch (error) {
      if (error instanceof ScanError) {
        await send({ type: 'error', error: error.code, message: error.message });
      } else if (error instanceof Error && error.message === 'timeout') {
        await send({ type: 'error', error: 'timeout', message: 'The page took too long to test.' });
      } else {
        await send({
          type: 'error',
          error: 'scan-failed',
          message: 'Something went wrong while testing that page. Try again in a minute.',
        });
      }
    } finally {
      await writer.close().catch(() => {});
    }
  })();
  ctx.waitUntil(work);

  return new Response(readable, {
    status: 200,
    headers: {
      ...headers,
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function getReport(env: Env, id: string, now: number, headers: Record<string, string>) {
  if (!ID_PATTERN.test(id)) return problem('not-found', 'No such report.', 404, headers);
  const row = await env.DB.prepare(
    'SELECT report FROM scan_reports WHERE id = ?1 AND expires_at > ?2',
  )
    .bind(id, now)
    .first<{ report: string }>();
  if (!row) return problem('not-found', 'This report doesn’t exist or has expired.', 404, headers);
  return new Response(row.report, {
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

async function getView(
  env: Env,
  id: string,
  variant: string,
  now: number,
  headers: Record<string, string>,
) {
  if (!ID_PATTERN.test(id) || !(VARIANT_ORDER as readonly string[]).includes(variant)) {
    return problem('not-found', 'No such view.', 404, headers);
  }
  const row = await env.DB.prepare(
    'SELECT image FROM scan_views WHERE report_id = ?1 AND variant = ?2 AND expires_at > ?3',
  )
    .bind(id, variant, now)
    .first<{ image: ArrayBuffer | number[] }>();
  if (!row) return problem('not-found', 'This view has expired.', 404, headers);
  const image = row.image instanceof ArrayBuffer ? row.image : new Uint8Array(row.image).buffer;
  return new Response(image, {
    headers: { ...headers, 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600' },
  });
}

/** Deletes expired reports and screenshots. Runs daily. */
export async function purgeExpired(env: Env, now: number): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM scan_views WHERE expires_at <= ?1').bind(now),
    env.DB.prepare('DELETE FROM scan_reports WHERE expires_at <= ?1').bind(now),
  ]);
}

export function createApp(deps: ScanDeps): ExportedHandler<Env> {
  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      const origin = request.headers.get('Origin');
      const allowed = originMatcher(env.ALLOWED_ORIGINS)(origin);
      const headers = cors(origin, allowed);

      if (request.method === 'OPTIONS')
        return new Response(null, { status: allowed ? 204 : 403, headers });

      if (url.pathname === '/v1/scans') {
        if (request.method !== 'POST')
          return problem('method', 'Use POST.', 405, { ...headers, Allow: 'POST, OPTIONS' });
        if (!allowed) return problem('origin', 'Not allowed.', 403, {});
        return startScan(request, env, ctx, deps, headers);
      }

      const view = /^\/v1\/reports\/([^/]+)\/views\/([a-z-]+)$/.exec(url.pathname);
      if (view && request.method === 'GET') {
        return getView(env, view[1] ?? '', view[2] ?? '', deps.now(), headers);
      }
      const report = /^\/v1\/reports\/([^/]+)$/.exec(url.pathname);
      if (report && request.method === 'GET')
        return getReport(env, report[1] ?? '', deps.now(), headers);

      return problem('not-found', 'Not found.', 404, headers);
    },

    async scheduled(_controller, env) {
      await purgeExpired(env, deps.now());
    },
  };
}
