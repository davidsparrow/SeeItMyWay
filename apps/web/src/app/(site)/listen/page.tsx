import type { Metadata } from 'next';
import Link from 'next/link';
import { config } from '@/lib/config';
import { ListenForm } from './listen-form';

export const metadata: Metadata = {
  title: 'Does your website listen?',
  description:
    'Visitors’ browsers already ask for less motion, dark mode and more contrast. See whether your website hears them.',
};

const EXAMPLE = [
  { mark: '✓', tone: 'text-good', text: 'Dark mode respected' },
  { mark: '✓', tone: 'text-good', text: 'Touch layout responsive' },
  { mark: '△', tone: 'text-warn', text: 'Reduced motion partially supported' },
  { mark: '✕', tone: 'text-[#c2410c]', text: 'Hero video ignores motion preference' },
  { mark: '✕', tone: 'text-[#c2410c]', text: 'Carousel automatically advances' },
  { mark: '✕', tone: 'text-[#c2410c]', text: 'Contrast preference not supported' },
];

const CSS_SNIPPET = `/* Respect what visitors' browsers already ask for */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

@media (prefers-color-scheme: dark) {
  :root { --bg: #0d0e13; --ink: #f1efe9; }
}

@media (prefers-contrast: more) {
  :root { --muted: var(--ink); --line: currentColor; }
}`;

const SDK_SNIPPET = `<!-- In <head>, so preferences apply before first paint -->
<script src="${config.sdkUrl}" data-simw-auto></script>

<style>
  [data-simw-motion="reduced"] .hero { animation: none; }
  [data-simw-density="roomy"] .cards { gap: 2rem; }
  [data-simw-color-scheme="dark"] { --bg: #0d0e13; }
</style>`;

const REACT_SNIPPET = `import { useExperience } from '@simw/sdk/react';

// Anywhere inside <SeeItMyWayProvider>:
function Hero() {
  const { motion, visualRichness } = useExperience();
  return motion === 'full' ? <AnimatedHero /> : <CalmHero />;
}`;

export default function ListenPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-20 px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
      <section className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div className="space-y-5">
          <p className="eyebrow">For website owners</p>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Does your website listen?
          </h1>
          <p className="text-xl text-muted">
            Your visitors&rsquo; browsers are already asking for less motion, dark interfaces and
            stronger contrast. Find out which requests your site hears, and which it ignores.
          </p>
          <ListenForm />
        </div>
        <figure className="card p-7" aria-label="Example report">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Example report</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            Your Preference Awareness Score
          </p>
          <p className="mt-3 font-display text-7xl font-semibold tracking-tight">
            42<span className="text-3xl text-muted"> / 100</span>
          </p>
          <ul className="mt-5 space-y-2">
            {EXAMPLE.map((row) => (
              <li key={row.text} className="flex gap-3">
                <span aria-hidden className={`w-4 font-bold ${row.tone}`}>
                  {row.mark}
                </span>
                {row.text}
              </li>
            ))}
          </ul>
          <Link href="/playground" className="btn btn-secondary mt-6">
            See a site through different preferences
          </Link>
        </figure>
      </section>

      <section aria-labelledby="start-title" className="space-y-6">
        <div className="max-w-3xl">
          <h2 id="start-title" className="font-display text-4xl font-semibold tracking-tight">
            Start listening today
          </h2>
          <p className="mt-2 text-lg text-muted">
            You don&rsquo;t need us to begin. The plain CSS below respects preferences millions of
            visitors already send. The SeeItMyWay SDK adds Passport preferences, local Tune controls
            and safe automatic adaptations on top.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            { title: 'Plain CSS', code: CSS_SNIPPET },
            { title: 'Any website (script tag)', code: SDK_SNIPPET },
            { title: 'React / Next.js', code: REACT_SNIPPET },
          ].map((s) => (
            <figure key={s.title} className="card min-w-0 p-5">
              <figcaption className="font-semibold">{s.title}</figcaption>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-surface-2 p-4 font-mono text-xs leading-relaxed">
                {s.code}
              </pre>
            </figure>
          ))}
        </div>
        <p className="text-sm text-muted">
          The SDK is in preview. The script above is served from this site; it isn&rsquo;t on npm or
          a public CDN yet.
        </p>
      </section>

      <section className="card p-7 sm:p-9">
        <h2 className="font-display text-2xl font-semibold">What SeeItMyWay is, and isn&rsquo;t</h2>
        <p className="mt-2 max-w-3xl text-muted">
          SeeItMyWay helps websites respect visitor preferences and deliver supported experience
          variants. It is not accessibility remediation, it doesn&rsquo;t make a website accessible
          on its own, and it will never claim WCAG compliance. Your site stays responsible for
          accessibility; we help it listen.
        </p>
      </section>
    </div>
  );
}
