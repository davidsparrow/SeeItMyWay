import type { AnonymousEvent, AnonymousEventSink } from '@simw/privacy';

/** Matches the events Worker's per-request cap. */
export const MAX_BATCH = 20;

export type Transport = (url: string, body: string) => void;

export interface RemoteSinkOptions {
  /** The events Worker base URL (`NEXT_PUBLIC_EVENTS_URL`). */
  baseUrl: string;
  /**
   * Read at send time. When true, nothing is ever sent for this visit:
   * SeeItMyWay's Global Privacy Control policy.
   */
  gpc: () => boolean;
  transport?: Transport;
}

export interface RemoteSink extends AnonymousEventSink {
  /** Sends whatever is queued (one request per 20 events). */
  flush(): void;
  /** Events waiting to be sent. */
  pending(): number;
}

/**
 * `navigator.sendBeacon` survives the page going away; `fetch` with
 * `keepalive` is the fallback. The body is sent as text/plain so the
 * request is CORS-simple (no preflight), and no credentials are attached.
 */
export const beaconTransport: Transport = (url, body) => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(url, body)) return;
    }
  } catch {
    // Fall through to fetch.
  }
  void fetch(url, {
    method: 'POST',
    body,
    keepalive: true,
    mode: 'cors',
    credentials: 'omit',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
  }).catch(() => {
    // Counting must never break the experience.
  });
};

/**
 * Batches allowlisted events for the events Worker. Events are sent when a
 * batch fills up and when the page is hidden or unloaded (see
 * `flushOnPageHide`), never with identifiers, cookies or timestamps.
 */
export function createRemoteSink({
  baseUrl,
  gpc,
  transport = beaconTransport,
}: RemoteSinkOptions): RemoteSink {
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/v1/events`;
  let queue: AnonymousEvent[] = [];
  let silenced = false;

  const blocked = () => {
    if (!silenced && gpc()) {
      // GPC: drop everything for the rest of this visit.
      silenced = true;
      queue = [];
    }
    return silenced;
  };

  const sink: RemoteSink = {
    record(event) {
      if (blocked()) return;
      queue.push(event);
      if (queue.length >= MAX_BATCH) sink.flush();
    },
    flush() {
      if (blocked() || queue.length === 0) return;
      const batch = queue;
      queue = [];
      for (let i = 0; i < batch.length; i += MAX_BATCH) {
        transport(endpoint, JSON.stringify({ events: batch.slice(i, i + MAX_BATCH) }));
      }
    },
    pending: () => queue.length,
  };
  return sink;
}

/** Flushes when the page is hidden (tab switch, app switch) or unloaded. */
export function flushOnPageHide(sink: RemoteSink, target: Window = window): () => void {
  const onHidden = () => {
    if (target.document.visibilityState === 'hidden') sink.flush();
  };
  const onPageHide = () => sink.flush();
  target.document.addEventListener('visibilitychange', onHidden);
  target.addEventListener('pagehide', onPageHide);
  return () => {
    target.document.removeEventListener('visibilitychange', onHidden);
    target.removeEventListener('pagehide', onPageHide);
  };
}
