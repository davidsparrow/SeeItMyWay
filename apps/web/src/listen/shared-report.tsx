'use client';

import type { ScanReport } from '@simw/scanner-core';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { config } from '@/lib/config';
import { fetchReport } from '@/lib/scanner-client';
import { ReportView } from './report-view';

type Loaded =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'error' }
  | { state: 'ready'; report: ScanReport };

const scannerUrl = config.scannerUrl;

/** Loads a stored report from the scanner Worker by its id. */
export function SharedReport({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' });

  useEffect(() => {
    if (!scannerUrl) return;
    let cancelled = false;
    fetchReport(scannerUrl, id)
      .then((report) => {
        if (!cancelled) setLoaded(report ? { state: 'ready', report } : { state: 'missing' });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ state: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const testAnother = (
    <Link href="/listen" className="btn btn-primary">
      Test a page
    </Link>
  );

  if (!scannerUrl) {
    return (
      <div className="card space-y-4 p-6">
        <p>The Site Listener Test isn&rsquo;t switched on for this site yet.</p>
        {testAnother}
      </div>
    );
  }
  if (loaded.state === 'loading') {
    return (
      <p className="text-muted" role="status">
        Loading the report…
      </p>
    );
  }
  if (loaded.state !== 'ready') {
    return (
      <div className="card space-y-4 p-6" role="status">
        <p>
          {loaded.state === 'missing'
            ? 'This report doesn’t exist or has expired. Reports are deleted after 30 days.'
            : 'We couldn’t load this report just now. Try again in a minute.'}
        </p>
        {testAnother}
      </div>
    );
  }
  return (
    <div className="card p-6 sm:p-8">
      <ReportView report={loaded.report} scannerUrl={scannerUrl} />
    </div>
  );
}
