'use client';

import {
  type AnonymousEvent,
  type AnonymousEventName,
  type AnonymousEventProps,
  type AnonymousEventSink,
  sanitizeEvent,
} from '@simw/privacy';
import { safeLocalStorage } from '@simw/sdk';
import { config } from './config';
import { createRemoteSink, flushOnPageHide, type RemoteSink } from './remote-sink';

/**
 * Anonymous counting (Addendum H).
 *
 * Every event is validated against the allowlist in @simw/privacy and kept
 * in a local log on this device, so /privacy can show exactly what was
 * recorded. When `NEXT_PUBLIC_EVENTS_URL` is set, events are also batched to
 * the events Worker, which stores per-day aggregates only.
 *
 * Global Privacy Control means nothing is sent: when the browser sends GPC,
 * the remote sink drops everything for the visit (checked at send time).
 * That's SeeItMyWay's policy, deliberately stronger than GPC requires.
 */
export const TELEMETRY_MODE: 'local-only' | 'remote' = config.eventsUrl ? 'remote' : 'local-only';

/** Global Privacy Control, read straight from the browser (`navigator.globalPrivacyControl`). */
export function gpcEnabled(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}

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

let remote: RemoteSink | null = null;

function remoteSink(): RemoteSink | null {
  if (!config.eventsUrl || typeof window === 'undefined') return null;
  if (!remote) {
    remote = createRemoteSink({ baseUrl: config.eventsUrl, gpc: gpcEnabled });
    flushOnPageHide(remote);
  }
  return remote;
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
    localSink.record(event);
    remoteSink()?.record(event);
  } catch {
    // Counting must never break the experience.
  }
}
