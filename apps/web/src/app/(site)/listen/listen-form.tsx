'use client';

import { scoreBucket } from '@simw/privacy';
import {
  normalizeScanUrl,
  type ScanReport,
  URL_REJECTION_MESSAGES,
  VARIANT_ORDER,
  type Variant,
} from '@simw/scanner-core';
import { type FormEvent, useState } from 'react';
import { PROGRESS_LABELS, SCANNER_RETENTION } from '@/content/listen';
import { config } from '@/lib/config';
import { runSiteScan, ScanFailure } from '@/lib/scanner-client';
import { track } from '@/lib/telemetry';
import { useCounting } from '@/lib/use-counting';
import { ReportView } from '@/listen/report-view';

const WILL_CHECK = [
  'Reduced motion: do animations, parallax and carousels calm down?',
  'Color scheme: is there a dark theme, and does it follow the device?',
  'Contrast and forced colors: does anything disappear?',
  'Autoplay: does video or audio start on its own?',
  'Hover dependence: can touch users reach everything?',
];

type State =
  | { phase: 'idle' }
  | { phase: 'coming-soon' }
  | { phase: 'scanning'; url: string; stripped: boolean; done: Variant[] }
  | { phase: 'done'; report: ScanReport; stripped: boolean }
  | { phase: 'error'; message: string };

/**
 * The Site Listener Test (V0C). With `NEXT_PUBLIC_SCANNER_URL` set, it sends
 * the page's address, without any query string or fragment, to the scanner
 * Worker and streams the report back. Without it, it only notes interest
 * and the address goes nowhere.
 */
export function ListenForm() {
  const [input, setInput] = useState('');
  const [state, setState] = useState<State>({ phase: 'idle' });
  const counting = useCounting();
  const scannerUrl = config.scannerUrl;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    track('owner_test_interest', {}, { oncePerPage: true });
    if (!scannerUrl) {
      setState({ phase: 'coming-soon' });
      return;
    }
    const normalized = normalizeScanUrl(input);
    if (!normalized.ok) {
      setState({ phase: 'error', message: URL_REJECTION_MESSAGES[normalized.reason] });
      return;
    }
    const stripped = normalized.stripped.query || normalized.stripped.fragment;
    setState({ phase: 'scanning', url: normalized.url, stripped, done: [] });
    try {
      // The query string and fragment never leave this browser.
      const { report } = await runSiteScan(scannerUrl, normalized.url, (e) => {
        if (e.type !== 'progress') return;
        setState((s) => (s.phase === 'scanning' ? { ...s, done: [...s.done, e.variant] } : s));
      });
      setState({ phase: 'done', report, stripped });
      track('owner_test_completed', { score: scoreBucket(report.score) });
    } catch (error) {
      setState({
        phase: 'error',
        message:
          error instanceof ScanFailure
            ? error.message
            : 'The Site Listener Test couldn’t run just now. Try again in a minute.',
      });
    }
  };

  const busy = state.phase === 'scanning';

  return (
    <div className="card space-y-6 p-6 sm:p-8">
      <form onSubmit={submit} className="flex flex-wrap gap-3">
        <label htmlFor="site-url" className="sr-only">
          Your website address
        </label>
        <input
          id="site-url"
          type="text"
          inputMode="url"
          autoComplete="url"
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://your-website.com"
          className="min-h-14 min-w-0 flex-1 rounded-full border border-line bg-surface px-5 text-lg text-ink placeholder:text-muted"
        />
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy} aria-busy={busy}>
          {busy ? 'Testing…' : 'Test my site'}
        </button>
      </form>

      {state.phase === 'idle' ? (
        <p className="text-sm text-muted">
          {scannerUrl
            ? `Free. No account. We load that one public page from Cloudflare’s network, once for each preference, with no cookies. We drop anything after ? or # first, keep the report for ${SCANNER_RETENTION.reportDays} days (screenshots for ${SCANNER_RETENTION.viewHours} hours), and keep nothing about you.`
            : 'Free. No account. We’ll only ever load public pages.'}
        </p>
      ) : null}

      {state.phase === 'coming-soon' ? (
        <div className="pop space-y-3" role="status">
          <p className="font-display text-2xl font-semibold">
            The Site Listener Test is nearly here.
          </p>
          <p className="text-muted">
            We haven&rsquo;t scanned anything, and your address wasn&rsquo;t sent anywhere.
            {counting === 'gpc'
              ? ' Global Privacy Control is on, so we didn’t count that you asked, either.'
              : counting === 'remote'
                ? ' We only counted, anonymously, that a site owner asked.'
                : ''}{' '}
            When the test launches, it will check:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {WILL_CHECK.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.phase === 'scanning' ? (
        <div className="space-y-3" aria-live="polite">
          <p className="font-semibold">Testing {state.url}</p>
          {state.stripped ? (
            <p className="text-sm text-muted">
              We removed the part after ? or # from the address. It wasn&rsquo;t sent.
            </p>
          ) : null}
          <ol className="space-y-1.5">
            {VARIANT_ORDER.map((variant) => {
              const done = state.done.includes(variant);
              return (
                <li key={variant} className={done ? '' : 'text-muted'}>
                  <span aria-hidden className="inline-block w-5 font-bold text-good">
                    {done ? '✓' : '·'}
                  </span>
                  {PROGRESS_LABELS[variant]}
                  <span className="sr-only">{done ? ': done' : ': waiting'}</span>
                </li>
              );
            })}
          </ol>
          <p className="text-sm text-muted">
            One public page, loaded five ways from Cloudflare&rsquo;s network. Usually 15–30
            seconds.
          </p>
        </div>
      ) : null}

      {state.phase === 'error' ? (
        <p className="font-semibold text-[#c2410c]" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.phase === 'done' && scannerUrl ? (
        <div className="pop space-y-4">
          {state.stripped ? (
            <p className="text-sm text-muted">
              We removed the part after ? or # from the address before testing it.
            </p>
          ) : null}
          <ReportView report={state.report} scannerUrl={scannerUrl} />
        </div>
      ) : null}
    </div>
  );
}
