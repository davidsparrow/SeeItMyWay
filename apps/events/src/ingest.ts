import { type AnonymousEvent, sanitizeEvent } from '@simw/privacy';

/** Small on purpose: a real batch of 20 events is well under 2 KB. */
export const MAX_BODY_BYTES = 8 * 1024;
export const MAX_EVENTS = 20;

export type BodyResult = { ok: true; text: string } | { ok: false; status: 400 | 413 };

/** Reads at most `limit` bytes, without buffering anything larger. */
export async function readCappedBody(
  request: Request,
  limit: number = MAX_BODY_BYTES,
): Promise<BodyResult> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > limit) return { ok: false, status: 413 };
  if (!request.body) return { ok: false, status: 400 };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return { ok: false, status: 413 };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(bytes) };
}

export type BatchResult = { ok: true; events: AnonymousEvent[] } | { ok: false };

/**
 * Parses `{ events: [...] }`. The batch shape must be right; individual
 * events that fall outside the allowlist are dropped silently.
 */
export function parseBatch(text: string): BatchResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (typeof parsed !== 'object' || parsed === null) return { ok: false };
  const list = (parsed as { events?: unknown }).events;
  if (!Array.isArray(list) || list.length > MAX_EVENTS) return { ok: false };

  const events: AnonymousEvent[] = [];
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const { name, props } = item as { name?: unknown; props?: unknown };
    if (typeof name !== 'string') continue;
    if (props !== undefined && (typeof props !== 'object' || props === null)) continue;
    const clean = sanitizeEvent(name, (props ?? {}) as Record<string, unknown>);
    if (clean) events.push(clean);
  }
  return { ok: true, events };
}

/** Sorted-key JSON, so the same props always produce the same row. */
export function canonicalProps(props: Record<string, string | number>): string {
  const sorted: Record<string, string | number> = {};
  for (const key of Object.keys(props).sort()) sorted[key] = props[key] as string | number;
  return JSON.stringify(sorted);
}

export interface CountRow {
  name: string;
  props: string;
  count: number;
}

/** Collapses a batch into one increment per distinct (name, props). */
export function aggregate(events: readonly AnonymousEvent[]): CountRow[] {
  const rows = new Map<string, CountRow>();
  for (const event of events) {
    const props = canonicalProps(event.props as Record<string, string | number>);
    const key = `${event.name}\u0000${props}`;
    const row = rows.get(key);
    if (row) row.count += 1;
    else rows.set(key, { name: event.name, props, count: 1 });
  }
  return [...rows.values()];
}

/** UTC calendar day: the finest time granularity ever stored. */
export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
