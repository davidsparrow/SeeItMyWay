import Link from 'next/link';
import { BrowserCheckup } from '@/checkup/browser-checkup';

const PRINCIPLES = [
  {
    title: 'Ask, don’t track',
    body: 'Websites respond to what you tell them, not to a profile built from where you’ve been.',
  },
  {
    title: 'Coarse, not creepy',
    body: '"Roomy", "less motion", "no autoplay". Simple buckets that millions of people share, so they can’t single you out.',
  },
  {
    title: 'Yours to change',
    body: 'Every preference lives with you. Change it, override it for one site, or stop sharing it any time.',
  },
];

export default function HomePage() {
  return (
    <>
      <BrowserCheckup />

      <section
        aria-labelledby="vision-title"
        className="mx-auto mt-16 max-w-6xl px-4 sm:mt-24 sm:px-6"
      >
        <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-start">
          <div>
            <p className="eyebrow">Personalization without profiling</p>
            <h2
              id="vision-title"
              className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl"
            >
              We think websites should adapt to your preferences without tracking who you are.
            </h2>
          </div>
          <ul className="grid gap-4">
            {PRINCIPLES.map((p) => (
              <li key={p.title} className="card p-5">
                <p className="font-display text-xl font-semibold">{p.title}</p>
                <p className="mt-1 text-muted">{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="cta-title"
        className="mx-auto mt-16 grid max-w-6xl gap-5 px-4 sm:mt-24 sm:px-6 md:grid-cols-2"
      >
        <div className="card flex flex-col justify-between gap-6 p-7 sm:p-9">
          <div>
            <h2 id="cta-title" className="font-display text-3xl font-semibold tracking-tight">
              Tell the web how you like the web.
            </h2>
            <p className="mt-2 text-muted">
              Build a preference profile in a minute, then watch a website rearrange itself around
              it.
            </p>
          </div>
          <Link href="/passport" className="btn btn-primary btn-lg self-start">
            Build my preference profile
          </Link>
        </div>
        <div className="card flex flex-col justify-between gap-6 p-7 sm:p-9">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Own a website?</h2>
            <p className="mt-2 text-muted">
              Your visitors are already asking for less motion, dark mode and more contrast. Find
              out whether your site is listening.
            </p>
          </div>
          <Link href="/listen" className="btn btn-secondary btn-lg self-start">
            See whether your site listens
          </Link>
        </div>
      </section>
    </>
  );
}
