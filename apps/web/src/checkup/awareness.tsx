'use client';

import { safeLocalStorage } from '@simw/sdk';
import type { NativeSignalId } from '@simw/types';
import { useEffect, useState } from 'react';
import { CHECKUP_KEYS } from '@/lib/site';
import { track } from '@/lib/telemetry';

type Stage = 'detectable' | 'where' | 'done';

function readAnswered(): Record<string, true> {
  try {
    return JSON.parse(safeLocalStorage().get(CHECKUP_KEYS.research) ?? '{}') as Record<
      string,
      true
    >;
  } catch {
    return {};
  }
}

/**
 * Anonymous awareness research (Addendum C.4): two yes/no questions per
 * signal, asked once. No identity questions, ever.
 */
export function AwarenessQuestion({
  signal,
  changeable,
}: {
  signal: NativeSignalId;
  changeable: boolean;
}) {
  const [stage, setStage] = useState<Stage | null>(null);

  useEffect(() => {
    setStage(readAnswered()[signal] ? null : 'detectable');
  }, [signal]);

  if (stage === null) return null;

  const finish = () => {
    const answered = readAnswered();
    answered[signal] = true;
    safeLocalStorage().set(CHECKUP_KEYS.research, JSON.stringify(answered));
    setStage('done');
  };

  const answer = (question: 'knew_detectable' | 'knew_where', value: 'yes' | 'no') => {
    track('awareness_answered', { signal, question, answer: value });
    if (question === 'knew_detectable' && changeable) setStage('where');
    else finish();
  };

  if (stage === 'done') {
    return (
      <p className="text-sm text-muted" role="status">
        Thanks. Answers are anonymous: no account, no ID, nothing linking them to you.
      </p>
    );
  }

  const question = stage === 'detectable' ? 'knew_detectable' : 'knew_where';
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
      <p className="font-medium">
        {stage === 'detectable'
          ? 'Before today, did you know websites could detect this?'
          : 'Did you know where to change it?'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-secondary !min-h-9 !px-4 text-sm"
          onClick={() => answer(question, 'yes')}
        >
          Yes
        </button>
        <button
          type="button"
          className="btn btn-secondary !min-h-9 !px-4 text-sm"
          onClick={() => answer(question, 'no')}
        >
          No
        </button>
      </div>
    </div>
  );
}
