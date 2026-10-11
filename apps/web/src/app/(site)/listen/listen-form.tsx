'use client';

import { type FormEvent, useState } from 'react';
import { track } from '@/lib/telemetry';
import { useCounting } from '@/lib/use-counting';

const WILL_CHECK = [
  'Reduced motion: do animations, parallax and carousels calm down?',
  'Color scheme: is there a dark theme, and does it follow the device?',
  'Contrast and forced colors: does anything disappear?',
  'Autoplay: does video or audio start on its own?',
  'Hover dependence: can touch users reach everything?',
];

/**
 * V0C placeholder. The real Site Listener Test runs in apps/scanner on
 * Cloudflare Browser Run; until then this collects interest only. The URL is
 * never sent or stored.
 */
export function ListenForm() {
  const [submitted, setSubmitted] = useState(false);
  const counting = useCounting();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    track('owner_test_interest', {}, { oncePerPage: true });
  };

  return (
    <div className="card p-6 sm:p-8">
      <form onSubmit={submit} className="flex flex-wrap gap-3">
        <label htmlFor="site-url" className="sr-only">
          Your website address
        </label>
        <input
          id="site-url"
          type="url"
          required
          placeholder="https://your-website.com"
          className="min-h-14 min-w-0 flex-1 rounded-full border border-line bg-surface px-5 text-lg text-ink placeholder:text-muted"
        />
        <button type="submit" className="btn btn-primary btn-lg">
          Test my site
        </button>
      </form>
      {submitted ? (
        <div className="pop mt-6 space-y-3" role="status">
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
      ) : (
        <p className="mt-3 text-sm text-muted">
          Free. No account. We&rsquo;ll only ever load public pages.
        </p>
      )}
    </div>
  );
}
