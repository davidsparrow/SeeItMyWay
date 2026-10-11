'use client';

import { useState } from 'react';
import { track } from '@/lib/telemetry';

const BENEFITS = [
  'Stores your expanded preferences',
  'Optionally syncs them between your devices',
  'Notices when a site understands SeeItMyWay',
  'Shares only standardized preferences you’ve approved',
  'Lets you override anything, site by site',
];

/**
 * PRD A.9: only after the visitor has built something useful do we ask
 * whether they'd like to carry it with them.
 */
export function ExtensionUpsell({ hasProfile }: { hasProfile: boolean }) {
  const [open, setOpen] = useState(false);
  const [interested, setInterested] = useState(false);

  return (
    <section aria-labelledby="carry-title" className="card overflow-hidden p-7 sm:p-10">
      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className="text-lg text-muted">
            {hasProfile
              ? 'Your SeeItMyWay preferences currently work here.'
              : 'Once you save a profile, it starts working on this site straight away.'}
          </p>
          <h2 id="carry-title" className="mt-2 font-display text-4xl font-semibold tracking-tight">
            Want them to follow you to participating websites?
          </h2>
          {!open ? (
            <button
              type="button"
              className="btn btn-primary btn-lg mt-6"
              onClick={() => setOpen(true)}
            >
              Get the SeeItMyWay Passport
            </button>
          ) : (
            <div className="pop mt-6 space-y-4">
              <p>
                The Passport browser extension is still being built. It will stay free, permanently:
                the preference layer should never be the thing that&rsquo;s monetized.
              </p>
              {interested ? (
                <p className="font-semibold text-good" role="status">
                  Thanks, noted. No email needed: we&rsquo;ll announce it right here.
                </p>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setInterested(true);
                    track('extension_interest', {}, { oncePerPage: true });
                  }}
                >
                  I&rsquo;d use this
                </button>
              )}
            </div>
          )}
        </div>
        <ul className="space-y-3">
          {BENEFITS.map((b) => (
            <li key={b} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-sm text-accent"
              >
                ✓
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
