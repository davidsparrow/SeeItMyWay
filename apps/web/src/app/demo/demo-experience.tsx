'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LogoMark } from '@/components/logo';
import { NorthlightSite } from '@/northlight/northlight-site';
import { TunePanel } from '@/northlight/tune-panel';
import { useNorthlight, useNorthlightTone } from '@/northlight/use-northlight';

export function DemoExperience() {
  const { sdk, state } = useNorthlight();
  const [tone, setTone] = useNorthlightTone();
  const [annotate, setAnnotate] = useState(false);

  return (
    <>
      <div className="relative z-30 border-b border-line bg-surface text-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold">
            <LogoMark className="size-5 text-accent" />
            <span aria-hidden>←</span> SeeItMyWay
          </Link>
          <p className="order-last w-full text-muted sm:order-none sm:w-auto sm:min-w-0 sm:flex-1">
            You&rsquo;re visiting <strong className="text-ink">Northlight</strong>, a fictional
            participating website. It adapts to your device, your Passport and its own Tune panel.
          </p>
          <label className="ml-auto inline-flex min-h-[var(--simw-target-size,36px)] cursor-pointer items-center gap-2 font-medium sm:ml-0">
            <input
              type="checkbox"
              checked={annotate}
              onChange={(e) => setAnnotate(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            Show what adapted
          </label>
        </div>
      </div>
      <main id="main">
        <NorthlightSite
          experience={state.experience}
          sources={state.sources}
          tone={tone}
          annotate={annotate}
        />
      </main>
      <TunePanel sdk={sdk} state={state} tone={tone} onTone={setTone} />
    </>
  );
}
