'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from './logo';

const NAV = [
  { href: '/', label: 'Browser Checkup' },
  { href: '/playground', label: 'Playground' },
  { href: '/passport', label: 'Passport' },
  { href: '/demo', label: 'Demo site' },
  { href: '/listen', label: 'For site owners' },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header
      className="sticky top-0 z-40 border-b border-line backdrop-blur-xl"
      style={{ background: 'var(--header-bg)' }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="rounded-lg" aria-label="SeeItMyWay home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="-mx-1 flex max-w-full overflow-x-auto">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-[var(--simw-target-size,36px)] items-center whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-accent-soft text-accent'
                        : 'text-muted hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
