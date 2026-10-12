import Link from 'next/link';

const CONCEPTS = [
  { label: 'Interface density', poles: ['Compact', 'Roomy'], at: 0.7 },
  { label: 'Content detail', poles: ['Concise', 'Detailed'], at: 0.35 },
  { label: 'Instructions', poles: ['Quick', 'Step-by-step'], at: 0.85 },
  { label: 'Visual richness', poles: ['Minimal', 'Rich'], at: 0.6 },
  { label: 'Autoplay', poles: ['Allowed', 'Never'], at: 1 },
  { label: 'Navigation', poles: ['Compact', 'Simple'], at: 0.5 },
] as const;

/** PRD A.7: the "aha" transition from what browsers say today to what they could say. */
export function AhaTransition() {
  return (
    <section aria-labelledby="aha-title" className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="card overflow-hidden p-6 sm:p-10">
        <p className="text-lg text-muted">
          That&rsquo;s what your browser can tell websites today.
        </p>
        <h2
          id="aha-title"
          className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl"
        >
          But what if you could tell websites more?
        </h2>
        <ul className="mt-8 grid gap-x-10 gap-y-5 md:grid-cols-2">
          {CONCEPTS.map((c) => (
            <li key={c.label}>
              <p className="text-sm font-semibold">{c.label}</p>
              <div className="mt-2 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted">
                <span className="w-16 text-right">{c.poles[0]}</span>
                <span aria-hidden className="relative h-1.5 flex-1 rounded-full bg-surface-2">
                  <span
                    className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent shadow"
                    style={{ left: `${c.at * 100}%` }}
                  />
                </span>
                <span className="w-24">{c.poles[1]}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-10 grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-end">
          <div>
            <p className="text-lg">
              Browsers don&rsquo;t currently carry most of these preferences between websites.
            </p>
            <p className="mt-1 font-display text-3xl font-semibold text-accent">
              We think they should.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link href="/passport" className="btn btn-primary btn-lg">
              Build my preference profile
            </Link>
            <Link href="/playground" className="btn btn-secondary btn-lg">
              See the difference
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
