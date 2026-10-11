'use client';

import type { CheckStatus, ScanReport, Variant } from '@simw/scanner-core';
import Link from 'next/link';
import { useState } from 'react';
import { config } from '@/lib/config';
import { viewUrl } from '@/lib/scanner-client';

const STATUS: Record<CheckStatus, { mark: string; tone: string; label: string; order: number }> = {
  pass: { mark: '✓', tone: 'text-good', label: 'Heard:', order: 0 },
  partial: { mark: '△', tone: 'text-warn', label: 'Partly heard:', order: 1 },
  fail: { mark: '✕', tone: 'text-[#c2410c]', label: 'Not heard:', order: 2 },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

function Views({ report, scannerUrl }: { report: ScanReport; scannerUrl: string }) {
  const [broken, setBroken] = useState<ReadonlySet<Variant>>(new Set());
  const views = report.views.filter((v) => !broken.has(v.variant));
  return (
    <section aria-labelledby={`views-${report.id}`} className="space-y-3">
      <h3 id={`views-${report.id}`} className="font-display text-2xl font-semibold">
        See your site through different visitor preferences
      </h3>
      {views.length > 0 ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-2">
            {views.map((view) => (
              <li key={view.variant}>
                <figure className="overflow-hidden rounded-2xl border border-line bg-surface-2">
                  {/* biome-ignore lint/performance/noImgElement: a short-lived screenshot from the scanner Worker, not a Next asset. */}
                  <img
                    src={viewUrl(scannerUrl, report.id, view.variant)}
                    alt={`The page, loaded by a browser that ${view.label.toLowerCase()}`}
                    loading="lazy"
                    className="aspect-[8/5] w-full object-cover object-top"
                    onError={() => setBroken((b) => new Set(b).add(view.variant))}
                  />
                  <figcaption className="px-3 py-2 text-sm font-semibold">{view.label}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
          {report.viewsExpireAt ? (
            <p className="text-sm text-muted">
              Screenshots are deleted on {formatDate(report.viewsExpireAt)}.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-muted">
          The screenshots from this test have been deleted.{' '}
          <Link
            href="/playground"
            className="font-semibold text-accent underline underline-offset-4"
          >
            See a site through different preferences in the Playground
          </Link>
          .
        </p>
      )}
    </section>
  );
}

/** The Preference Awareness Score and its ✓ / △ / ✕ rows (PRD B.1). */
export function ReportView({ report, scannerUrl }: { report: ScanReport; scannerUrl: string }) {
  const [copied, setCopied] = useState(false);
  const rows = [...report.checks].sort((a, b) => STATUS[a.status].order - STATUS[b.status].order);
  const shareUrl = `${config.siteUrl}/listen/report/${report.id}`;

  return (
    <article className="space-y-8" aria-labelledby={`score-${report.id}`} data-testid="scan-report">
      <header className="space-y-2">
        <p className="text-sm text-muted">
          {report.url} · tested {formatDate(report.scannedAt)}
        </p>
        <h2 id={`score-${report.id}`} className="font-display text-2xl font-semibold">
          Your Preference Awareness Score
        </h2>
        <p className="font-display text-7xl font-semibold tracking-tight">
          {report.score}
          <span className="text-3xl text-muted"> / 100</span>
        </p>
      </header>

      <ul className="space-y-3">
        {rows.map((check) => {
          const s = STATUS[check.status];
          return (
            <li key={check.id} className="flex gap-3">
              <span aria-hidden className={`w-4 shrink-0 font-bold ${s.tone}`}>
                {s.mark}
              </span>
              <span>
                <span className="sr-only">{s.label} </span>
                <span className="font-semibold">
                  {check.title}
                  {check.possible && !/^possible\b/i.test(check.title) ? (
                    <span className="font-normal text-muted"> (possible)</span>
                  ) : null}
                </span>
                <span className="block text-sm text-muted">{check.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <Views report={report} scannerUrl={scannerUrl} />

      <div className="space-y-2 rounded-2xl bg-surface-2 p-4 text-sm">
        <p>
          <span className="font-semibold">Share this report: </span>
          <a href={shareUrl} className="break-all text-accent underline underline-offset-4">
            {shareUrl}
          </a>{' '}
          <button
            type="button"
            className="btn btn-ghost !min-h-8 !px-3 text-sm"
            onClick={() => {
              navigator.clipboard
                .writeText(shareUrl)
                .then(() => setCopied(true))
                .catch(() => {});
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </p>
        <p className="text-muted">Kept until {formatDate(report.expiresAt)}, then deleted.</p>
        {report.notes.map((note) => (
          <p key={note} className="text-muted">
            {note}
          </p>
        ))}
      </div>
    </article>
  );
}
