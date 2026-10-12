import Link from 'next/link';
import { Wordmark } from './logo';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-sm text-sm text-muted">
            Personalization without profiling. Websites that adapt to how you like the web, without
            needing to know who you are.
          </p>
        </div>
        <nav aria-label="Explore" className="space-y-2 text-sm">
          <p className="font-semibold text-ink">Explore</p>
          <ul className="space-y-1.5 text-muted">
            <li>
              <Link className="hover:text-ink" href="/">
                What does my browser say?
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" href="/playground">
                See the difference
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" href="/passport">
                Build your Passport
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" href="/demo">
                Adaptive demo site
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="About" className="space-y-2 text-sm">
          <p className="font-semibold text-ink">Trust</p>
          <ul className="space-y-1.5 text-muted">
            <li>
              <Link className="hover:text-ink" href="/privacy">
                Our promise &amp; what we count
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" href="/listen">
                Does your website listen?
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-line px-4 py-6 text-center text-xs text-muted">
        SeeItMyWay helps websites respect visitor preferences. It does not make a website accessible
        on its own, and it never claims to.
      </p>
    </footer>
  );
}
