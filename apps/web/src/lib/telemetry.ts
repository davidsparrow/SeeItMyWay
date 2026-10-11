'use client';

import {
  type AnonymousEvent,
  type AnonymousEventName,
  type AnonymousEventProps,
  type AnonymousEventSink,
  sanitizeEvent,
} from '@simw/privacy';
import { safeLocalStorage } from '@simw/sdk';

/**
 * Anonymous counting (Addendum H). V0 ships with storage stubbed: events are
 * validated against the allowlist in @simw/privacy and kept in this browser
 * only, so the /privacy page can show exactly what would be counted.
 *
 * To connect a real backend later, call `setEventSink()` with a sink that
 * POSTs to an aggregate counter. Nothing else in the app needs to change.
 */
export const TELEMETRY_MODE: 'local-only' | 'remote' = 'local-only';

const LOG_KEY = 'simw:local-event-log';
const LOG_LIMIT = 200;

export function readLocalLog(): AnonymousEvent[] {
  try {
    const parsed: unknown = JSON.parse(safeLocalStorage().get(LOG_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as AnonymousEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearLocalLog(): void {
  safeLocalStorage().remove(LOG_KEY);
}

const localSink: AnonymousEventSink = {
  record(event) {
    const log = readLocalLog();
    log.push(event);
    safeLocalStorage().set(LOG_KEY, JSON.stringify(log.slice(-LOG_LIMIT)));
  },
};

let sink: AnonymousEventSink = localSink;

export function setEventSink(next: AnonymousEventSink): void {
  sink = next;
}

const onceKeys = new Set<string>();

/**
 * Records an allowlisted anonymous event. Anything that fails validation is
 * dropped (and flagged in development).
 */
export function track<N extends AnonymousEventName>(
  name: N,
  props: AnonymousEventProps<N>,
  options: { oncePerPage?: boolean } = {},
): void {
  if (typeof window === 'undefined') return;
  if (options.oncePerPage) {
    const key = `${name}:${JSON.stringify(props)}`;
    if (onceKeys.has(key)) return;
    onceKeys.add(key);
  }
  const event = sanitizeEvent(name, props as Record<string, unknown>);
  if (!event) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[simw] dropped event outside the allowlist', name, props);
    }
    return;
  }
  try {
    sink.record(event);
  } catch {
    // Counting must never break the experience.
  }
}
