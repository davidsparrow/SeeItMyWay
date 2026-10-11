'use client';

import type { PlatformInfo } from '@simw/types';
import { Fragment, useState } from 'react';
import { type InstructionSet, instructionsFor, PLATFORM_LABELS } from '@/content/instructions';
import type { Topic } from '@/content/topics';

function Path({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Menu path">
      {steps.map((step, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a static menu path whose labels can repeat.
        <Fragment key={`${step}-${i}`}>
          {i > 0 ? (
            <li aria-hidden className="text-muted">
              →
            </li>
          ) : null}
          <li className="path-chip">{step}</li>
        </Fragment>
      ))}
    </ol>
  );
}

function Steps({ set }: { set: InstructionSet }) {
  return (
    <div className="space-y-2">
      <h4 className="font-display text-lg font-semibold">{set.label}</h4>
      <Path steps={set.steps} />
      {set.action ? <p className="text-sm font-medium">{set.action}</p> : null}
      {set.note ? <p className="text-sm text-muted">{set.note}</p> : null}
      {set.alternatives?.map((alt) => (
        <div key={alt.label} className="space-y-1.5 border-t border-dashed border-line pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{alt.label}</p>
          <Path steps={alt.steps} />
          {alt.action ? <p className="text-sm">{alt.action}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function HowToChange({
  topic,
  platform,
  onRecheck,
}: {
  topic: Topic;
  platform: PlatformInfo;
  /** Returns true if something changed. */
  onRecheck: () => boolean;
}) {
  const { recommended, others } = instructionsFor(topic.id, platform);
  const all = [...recommended, ...others];
  const [selected, setSelected] = useState<InstructionSet | undefined>(recommended[0] ?? others[0]);
  const [result, setResult] = useState<'changed' | 'same' | null>(null);

  return (
    <div className="space-y-4">
      {all.length === 0 ? (
        <p className="text-sm">
          We don&rsquo;t have verified steps for this one yet. Try searching your device&rsquo;s
          Settings for <strong>&ldquo;{topic.searchHint}&rdquo;</strong>.
        </p>
      ) : (
        <>
          {all.length > 1 ? (
            <fieldset className="flex min-w-0 flex-wrap gap-1.5">
              <legend className="sr-only">Choose a device</legend>
              {all.map((set) => (
                <button
                  key={set.platform}
                  type="button"
                  aria-pressed={selected === set}
                  onClick={() => setSelected(set)}
                  className={`min-h-[var(--simw-target-size,36px)] rounded-full border px-3 text-sm font-medium ${
                    selected === set
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  {PLATFORM_LABELS[set.platform]}
                  {recommended.includes(set) && recommended[0] === set ? ' · yours' : ''}
                </button>
              ))}
            </fieldset>
          ) : null}
          {selected ? <Steps set={selected} /> : null}
          {topic.searchHint ? (
            <p className="text-xs text-muted">
              Menus move between versions. If yours looks different, search Settings for &ldquo;
              {topic.searchHint}&rdquo;.
            </p>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2 p-4">
        <p className="flex-1 text-sm">
          Come back when you&rsquo;re done and we&rsquo;ll check again.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setResult(onRecheck() ? 'changed' : 'same')}
        >
          Check again
        </button>
        {result === 'same' ? (
          <p className="w-full text-sm text-muted" role="status">
            Nothing has changed yet. If you&rsquo;ve just switched it, some browsers only notice
            after a restart. We&rsquo;ll also notice on our own the moment it changes.
          </p>
        ) : null}
      </div>
    </div>
  );
}
