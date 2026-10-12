import type { ScanReport } from '@simw/scanner-core';
import { describe, expect, it, vi } from 'vitest';
import { fetchReport, runSiteScan, type ScanEvent, ScanFailure, viewUrl } from './scanner-client';

const report = { id: 'A'.repeat(22), url: 'https://example.com/', score: 64 } as ScanReport;

/** A response whose body arrives in awkward chunks, split mid-line. */
function streamed(lines: unknown[], status = 200): Response {
  const text = lines.map((l) => `${JSON.stringify(l)}\n`).join('');
  const encoder = new TextEncoder();
  const chunks = [text.slice(0, 7), text.slice(7, 40), text.slice(40)];
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { 'Content-Type': 'application/x-ndjson' } });
}

describe('runSiteScan', () => {
  it('reports progress as it streams and resolves with the report', async () => {
    const fetcher = vi.fn(async () =>
      streamed([
        {
          type: 'accepted',
          url: 'https://example.com/',
          stripped: { query: false, fragment: false },
        },
        { type: 'progress', variant: 'baseline', done: 1, total: 5 },
        { type: 'progress', variant: 'dark', done: 2, total: 5 },
        { type: 'report', report, reused: false },
      ]),
    );
    const seen: ScanEvent['type'][] = [];
    const result = await runSiteScan(
      'https://scanner.example/',
      'example.com',
      (e) => seen.push(e.type),
      fetcher,
    );
    expect(result).toEqual({ report, reused: false });
    expect(seen).toEqual(['accepted', 'progress', 'progress', 'report']);
    expect(fetcher).toHaveBeenCalledWith(
      'https://scanner.example/v1/scans',
      expect.objectContaining({ method: 'POST', credentials: 'omit' }),
    );
  });

  it('turns stream errors and refusals into messages fit to show', async () => {
    const failing = async () =>
      streamed([
        { type: 'error', error: 'http-status', message: 'The page answered with HTTP 404.' },
      ]);
    await expect(runSiteScan('https://s.example', 'x.com', () => {}, failing)).rejects.toEqual(
      new ScanFailure('http-status', 'The page answered with HTTP 404.'),
    );
    const refused = async () =>
      Response.json(
        { error: 'ip-literal', message: 'Please use the site’s name, not an IP address.' },
        { status: 400 },
      );
    await expect(
      runSiteScan('https://s.example', '10.0.0.1', () => {}, refused),
    ).rejects.toMatchObject({ code: 'ip-literal' });
    const offline = async () => {
      throw new TypeError('Failed to fetch');
    };
    await expect(
      runSiteScan('https://s.example', 'x.com', () => {}, offline),
    ).rejects.toMatchObject({ code: 'network' });
  });
});

describe('fetchReport', () => {
  it('returns null for unknown or malformed ids without asking for nonsense', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 404 }));
    expect(await fetchReport('https://s.example', 'A'.repeat(22), fetcher)).toBeNull();
    expect(await fetchReport('https://s.example', '../../etc', fetcher)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(viewUrl('https://s.example/', 'abc', 'dark')).toBe(
      'https://s.example/v1/reports/abc/views/dark',
    );
  });
});
