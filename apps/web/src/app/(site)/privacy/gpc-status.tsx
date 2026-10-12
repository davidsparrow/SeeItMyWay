'use client';

import { useGpc } from '@/lib/use-counting';

/** Live: whether this browser sends Global Privacy Control right now. */
export function GpcStatus() {
  const gpc = useGpc();
  return (
    <p className="font-semibold" role="status">
      {gpc
        ? '🛡️ Your browser is sending Global Privacy Control, so this browser sends us nothing.'
        : 'Your browser isn’t sending Global Privacy Control right now.'}
    </p>
  );
}
