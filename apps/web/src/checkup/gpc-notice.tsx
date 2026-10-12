import Link from 'next/link';
import { GPC_MESSAGE } from '@/content/gpc';

/** The Checkup's positive acknowledgement of Global Privacy Control. */
export function GpcNotice({ className = '' }: { className?: string }) {
  return (
    <p
      className={`flex gap-3 rounded-2xl border border-good bg-surface p-4 ${className}`}
      data-testid="gpc-notice"
    >
      <span aria-hidden className="text-xl">
        🛡️
      </span>
      <span>
        <strong className="font-semibold">{GPC_MESSAGE}</strong>{' '}
        <Link href="/privacy" className="font-semibold text-accent underline underline-offset-4">
          How we handle it
        </Link>
      </span>
    </p>
  );
}
