import type { ScanReport, Variant } from '@simw/scanner-core';

/** The scanner Worker's stream events (apps/scanner/src/app.ts). */
export type ScanEvent =
  | { type: 'accepted'; url: string; stripped: { query: boolean; fragment: boolean } }
  | { type: 'progress'; variant: Variant; done: number; total: number }
  | { type: 'report'; report: ScanReport; reused: boolean }
  | { type: 'error'; error: string; message: string };

export class ScanFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ScanFailure';
  }
}

const GENERIC = 'The Site Listener Test couldn’t run just now. Try again in a minute.';

const base = (url: string) => url.replace(/\/+$/, '');

/**
 * Starts a scan and reports each stream event as it arrives. Resolves with
 * the report, or rejects with a `ScanFailure` carrying a message fit to show.
 */
export async function runSiteScan(
  scannerUrl: string,
  url: string,
  onEvent: (event: ScanEvent) => void,
  fetcher: typeof fetch = fetch,
): Promise<{ report: ScanReport; reused: boolean }> {
  let response: Response;
  try {
    response = await fetcher(`${base(scannerUrl)}/v1/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      credentials: 'omit',
    });
  } catch {
    throw new ScanFailure('network', GENERIC);
  }
  if (!response.ok || !response.body) {
    const problem = (await response.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;
    throw new ScanFailure(problem?.error ?? 'http', problem?.message ?? GENERIC);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = '';
  let result: { report: ScanReport; reused: boolean } | null = null;
  const handle = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as ScanEvent;
    onEvent(event);
    if (event.type === 'report') result = { report: event.report, reused: event.reused };
    if (event.type === 'error') throw new ScanFailure(event.error, event.message);
  };
  for (;;) {
    const { done, value } = await reader.read();
    buffered += decoder.decode(value, { stream: !done });
    const lines = buffered.split('\n');
    buffered = lines.pop() ?? '';
    for (const line of lines) handle(line);
    if (done) break;
  }
  handle(buffered);
  if (!result) throw new ScanFailure('incomplete', GENERIC);
  return result;
}

/** A stored report, or null if it doesn't exist or has expired. */
export async function fetchReport(
  scannerUrl: string,
  id: string,
  fetcher: typeof fetch = fetch,
): Promise<ScanReport | null> {
  if (!/^[A-Za-z0-9_-]{22}$/.test(id)) return null;
  const response = await fetcher(`${base(scannerUrl)}/v1/reports/${id}`, { credentials: 'omit' });
  if (response.status === 404) return null;
  if (!response.ok) throw new ScanFailure('http', GENERIC);
  return (await response.json()) as ScanReport;
}

export function viewUrl(scannerUrl: string, id: string, variant: Variant): string {
  return `${base(scannerUrl)}/v1/reports/${id}/views/${variant}`;
}
