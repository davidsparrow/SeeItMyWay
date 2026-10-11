'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { detectPlatform, diffSnapshots, type SignalChange } from '@simw/detector';
import type { AnonymousEventProps } from '@simw/privacy';
import { safeLocalStorage } from '@simw/sdk';
import { useSeeItMyWay, useSeeItMyWayInstance } from '@simw/sdk/react';
import type { NativeSignalId, NativeSignals, NativeSnapshot, PlatformInfo } from '@simw/types';
import { TOPICS, topicForSignal, type Topic } from '@/content/topics';
import { CHECKUP_KEYS } from '@/lib/site';
import { track } from '@/lib/telemetry';
import { AhaTransition } from './aha';
import { RawSignals } from './raw-signals';
import { SignalCard } from './signal-card';
import { Wishlist } from './wishlist';
import './checkup.css';

type Phase = 'idle' | 'listening' | 'revealed';

interface Toast {
  id: number;
  text: string;
}

function visibleTopics(signals: NativeSignals): Topic[] {
  return TOPICS.filter((t) => signals[t.signal].supported && t.state(signals) !== null);
}

function unsupportedTopics(signals: NativeSignals): Topic[] {
  return TOPICS.filter((t) => !signals[t.signal].supported && !t.hideWhenUnsupported);
}

/** Preference signals only: a new mouse is not a changed preference. */
function preferenceSnapshot(signals: NativeSignals): NativeSnapshot {
  const out: Record<string, string> = {};
  for (const topic of TOPICS) {
    const s = signals[topic.signal];
    if (topic.nature === 'preference' && s.supported && s.value !== null)
      out[topic.signal] = s.value;
  }
  return out as NativeSnapshot;
}

function readLastSnapshot(): NativeSnapshot | null {
  try {
    const raw = safeLocalStorage().get(CHECKUP_KEYS.lastSnapshot);
    return raw ? (JSON.parse(raw) as NativeSnapshot) : null;
  } catch {
    return null;
  }
}

function SignalOrb({ listening, compact }: { listening: boolean; compact: boolean }) {
  return (
    <div className={`signal-orb mx-auto ${compact ? 'max-md:hidden' : ''}`} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="signal-ring" style={{ ['--i' as string]: i }} />
      ))}
      <div className="signal-orb-core">
        <svg viewBox="0 0 64 64" className="w-3/5">
          <rect
            x="6"
            y="10"
            width="52"
            height="40"
            rx="7"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            className="text-ink"
          />
          <path d="M6 20h52" stroke="currentColor" strokeWidth="3.5" className="text-ink" />
          <circle cx="13" cy="15" r="1.8" className="fill-current text-muted" />
          <circle cx="19" cy="15" r="1.8" className="fill-current text-muted" />
          <path
            d="M22 35a10 10 0 0 1 20 0"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M27 35a5 5 0 0 1 10 0"
            fill="none"
            stroke="var(--glow)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
        {listening ? (
          <span className="absolute -bottom-9 whitespace-nowrap text-sm font-semibold text-muted">
            Listening to your browser…
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function BrowserCheckup() {
  const sdk = useSeeItMyWayInstance();
  const state = useSeeItMyWay();
  const [phase, setPhase] = useState<Phase>('idle');
  const [platform, setPlatform] = useState<PlatformInfo>({
    os: 'unknown',
    browser: 'other',
    mobile: false,
  });
  const [changed, setChanged] = useState<ReadonlySet<NativeSignalId>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sinceLastVisit, setSinceLastVisit] = useState<string[]>([]);
  const [settled, setSettled] = useState(false);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const toastId = useRef(0);

  useEffect(() => setPlatform(detectPlatform()), []);

  const celebrate = useCallback(
    (changes: SignalChange[]) => {
      const signals = sdk.getState().signals;
      if (!signals) return;
      for (const change of changes) {
        const topic = topicForSignal(change.id);
        if (!topic || topic.nature !== 'preference') continue;
        const text = topic.state(signals)?.celebrate;
        if (change.to) {
          track('preference_changed', {
            signal: change.id,
            to: change.to,
          } as AnonymousEventProps<'preference_changed'>);
        }
        setChanged((prev) => new Set(prev).add(change.id));
        if (text) {
          const id = ++toastId.current;
          setToasts((t) => [...t, { id, text }]);
          window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 7000);
        }
      }
      safeLocalStorage().set(
        CHECKUP_KEYS.lastSnapshot,
        JSON.stringify(preferenceSnapshot(signals)),
      );
    },
    [sdk],
  );

  // The magic moment: change a setting elsewhere, and this page notices on its own.
  useEffect(() => sdk.onNativeChange(celebrate), [sdk, celebrate]);

  useEffect(() => {
    if (phase !== 'revealed' || !endRef.current || typeof IntersectionObserver === 'undefined')
      return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        track('checkup_completed', {}, { oncePerPage: true });
        io.disconnect();
      }
    });
    io.observe(endRef.current);
    return () => io.disconnect();
  }, [phase]);

  const reveal = () => {
    if (phase !== 'idle') return;
    track('checkup_started', {}, { oncePerPage: true });
    setPhase('listening');
    const motion = sdk.getState().experience.motion;
    const delay = motion === 'full' ? 1100 : motion === 'reduced' ? 450 : 0;
    window.setTimeout(() => {
      const current = sdk.getState();
      if (current.signals) {
        track(
          'signals_detected',
          { count: visibleTopics(current.signals).length },
          { oncePerPage: true },
        );
        const now = preferenceSnapshot(current.signals);
        const before = readLastSnapshot();
        if (before) {
          const messages = diffSnapshots(before, now)
            .map((c) => topicForSignal(c.id)?.state(current.signals!)?.celebrate)
            .filter((m): m is string => Boolean(m));
          setSinceLastVisit(messages);
        }
        safeLocalStorage().set(CHECKUP_KEYS.lastSnapshot, JSON.stringify(now));
      }
      setPhase('revealed');
      window.requestAnimationFrame(() => resultsRef.current?.focus());
      // Once the cards are in, a later motion change mustn't replay their entrance.
      window.setTimeout(() => setSettled(true), 3000);
    }, delay);
  };

  const recheck = () => {
    track('recheck_clicked', {});
    return sdk.recheck().length > 0;
  };

  const signals = state.signals;
  const revealed = phase === 'revealed' && signals;
  const topics = signals ? visibleTopics(signals) : [];
  const unsupported = signals ? unsupportedTopics(signals) : [];
  const changeable = topics.filter((t) => t.changeable).length;

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-10 pt-14 sm:px-6 md:grid-cols-[1.25fr_1fr] md:pt-20">
        <div>
          <p className="eyebrow">The web settings nobody told you about</p>
          {revealed ? (
            <h1
              ref={resultsRef}
              tabIndex={-1}
              className="mt-4 font-display text-5xl font-semibold leading-[1.05] tracking-tight outline-none sm:text-6xl"
            >
              Here&rsquo;s how the web sees your preferences.
            </h1>
          ) : (
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Your browser already tells websites how you like the web.
            </h1>
          )}
          <p className="mt-5 max-w-xl text-xl text-muted">
            {revealed
              ? 'Everything below was read just now, inside your browser. Nothing left your device.'
              : 'Most people were never shown what it’s saying. Your browser may already be telling websites how you’d like them to behave.'}
          </p>
          {!revealed ? (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={reveal}
                disabled={phase === 'listening'}
                aria-busy={phase === 'listening'}
              >
                {phase === 'listening' ? 'Listening…' : 'Show me mine'}
              </button>
              <p className="text-sm text-muted">
                No login. No questionnaire. Nothing is sent anywhere.
              </p>
            </div>
          ) : null}
        </div>
        <SignalOrb listening={phase === 'listening'} compact={Boolean(revealed)} />
      </section>

      {revealed ? (
        <div className="space-y-16 sm:space-y-24" data-settled={settled}>
          <section aria-label="Your results" className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6">
            {sinceLastVisit.length > 0 ? (
              <div className="card pop border-good p-5" role="status">
                <p className="font-semibold">Since your last visit:</p>
                <ul className="mt-1 space-y-1">
                  {sinceLastVisit.map((m) => (
                    <li key={m}>🎉 {m}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="card reveal p-6 sm:p-8" style={{ ['--i' as string]: 0 }}>
              <p className="text-sm font-bold uppercase tracking-wider text-muted">
                Your web currently says
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {topics.map((t) => (
                  <li
                    key={t.id}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3.5 py-1.5 font-semibold"
                  >
                    <span aria-hidden>{t.icon}</span> {t.state(signals)?.summary}
                  </li>
                ))}
              </ul>
              <div className="mt-6 grid gap-1 text-lg">
                <p>
                  <strong>
                    {changeable} of these {changeable === 1 ? 'is a choice' : 'are choices'} you can
                    change.
                  </strong>
                </p>
                <p className="text-muted">Most websites won&rsquo;t respect all of them yet.</p>
                <p className="font-display text-2xl font-semibold text-accent">
                  We&rsquo;re working on that part.
                </p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {topics.map((topic, i) => (
                <SignalCard
                  key={topic.id}
                  topic={topic}
                  signals={signals}
                  experience={state.experience}
                  platform={platform}
                  index={i + 1}
                  changed={changed.has(topic.signal)}
                  onRecheck={recheck}
                />
              ))}
            </div>

            {unsupported.length > 0 ? (
              <div className="rounded-3xl border border-dashed border-line p-5 sm:p-6">
                <p className="font-semibold">Not available in this browser</p>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {unsupported.map((t) => (
                    <li key={t.id} className="flex gap-3 text-sm">
                      <span aria-hidden className="text-lg">
                        {t.icon}
                      </span>
                      <span>
                        <strong>{t.title}.</strong>{' '}
                        <span className="text-muted">{t.unsupported}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <p className="text-muted">Changed a setting somewhere else?</p>
              <button type="button" className="btn btn-secondary" onClick={recheck}>
                Check again
              </button>
            </div>

            <RawSignals state={state} sdk={sdk} />
          </section>

          <div ref={endRef}>
            <AhaTransition />
          </div>
          <Wishlist />
        </div>
      ) : null}

      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast pop">
            <span aria-hidden className="text-2xl">
              🎉
            </span>
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
