'use client';

import type { Experience } from '@simw/protocol';
import type { NativeSignals, PlatformInfo } from '@simw/types';
import { Badge } from '@simw/ui';
import { type CSSProperties, useId, useState } from 'react';
import type { Topic } from '@/content/topics';
import { track } from '@/lib/telemetry';
import { AwarenessQuestion } from './awareness';
import { SignalDemo } from './demos';
import { HowToChange } from './how-to';

type Panel = 'meaning' | 'demo' | 'howto';

export function SignalCard({
  topic,
  signals,
  experience,
  platform,
  index,
  changed,
  onRecheck,
}: {
  topic: Topic;
  signals: NativeSignals;
  experience: Experience;
  platform: PlatformInfo;
  index: number;
  changed: boolean;
  onRecheck: () => boolean;
}) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const panelId = useId();
  const state = topic.state(signals);
  if (!state) return null;

  const open = (next: Panel) => {
    const closing = panel === next;
    setPanel(closing ? null : next);
    if (closing) return;
    const event =
      next === 'meaning' ? 'explainer_opened' : next === 'demo' ? 'demo_viewed' : 'howto_opened';
    track(event, { signal: topic.signal }, { oncePerPage: true });
  };

  const tab = (id: Panel, label: string) => (
    <button
      type="button"
      aria-expanded={panel === id}
      aria-controls={panelId}
      onClick={() => open(id)}
      className={`min-h-[var(--simw-target-size,36px)] rounded-full border px-3.5 text-sm font-semibold transition-colors ${
        panel === id
          ? 'border-accent bg-accent text-on-accent'
          : 'border-line bg-surface hover:bg-surface-2'
      }`}
    >
      {label}
    </button>
  );

  return (
    <article
      className="card reveal flex flex-col gap-4 p-5 sm:p-6"
      style={{ '--i': index } as CSSProperties}
      data-changed={changed}
      aria-labelledby={`${panelId}-title`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-11 place-items-center rounded-2xl bg-surface-2 text-xl"
          >
            {topic.icon}
          </span>
          <h3
            id={`${panelId}-title`}
            className="text-sm font-bold uppercase tracking-wider text-muted"
          >
            {topic.title}
          </h3>
        </div>
        {topic.nature === 'preference' ? (
          <Badge tone="accent">Your preference</Badge>
        ) : (
          <Badge tone="neutral">Device characteristic</Badge>
        )}
      </header>

      <div>
        <p className="font-display text-2xl font-semibold leading-tight">
          {changed ? <span aria-hidden>🎉 </span> : null}
          {state.headline}
        </p>
        <p className="mt-1.5 text-muted">{state.body}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tab('meaning', 'What does this mean?')}
        {topic.demo ? tab('demo', 'Show me the difference') : null}
        {topic.changeable ? tab('howto', 'Show me how to change this') : null}
      </div>

      {panel ? (
        <div id={panelId} className="pop rounded-2xl border border-line bg-bg p-4">
          {panel === 'meaning' ? (
            <div className="space-y-3">
              <p>{topic.meaning}</p>
              <div>
                <p className="text-sm font-semibold">What websites can do with it</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted">
                  {topic.sitesCanDo.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <p className="font-mono text-xs text-muted">For nerds: {topic.technical}</p>
            </div>
          ) : panel === 'demo' && topic.demo ? (
            <SignalDemo kind={topic.demo} base={experience} />
          ) : panel === 'howto' ? (
            <div className="space-y-3">
              <p className="font-semibold">Want websites to see this differently?</p>
              <HowToChange topic={topic} platform={platform} onRecheck={onRecheck} />
            </div>
          ) : null}
        </div>
      ) : null}

      {topic.nature === 'preference' ? (
        <div className="mt-auto border-t border-line pt-3">
          <AwarenessQuestion signal={topic.signal} changeable={topic.changeable} />
        </div>
      ) : null}
    </article>
  );
}
