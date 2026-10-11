'use client';

import { filterForSharing } from '@simw/privacy';
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_KEYS,
  type PreferenceKey,
  type PreferenceValue,
  resolveExperience,
  type SIMWPreferences,
  VOCABULARY,
} from '@simw/protocol';
import { createLocalPassport } from '@simw/sdk';
import { useSeeItMyWay } from '@simw/sdk/react';
import { PreferenceControl } from '@simw/ui';
import { useEffect, useMemo, useState } from 'react';
import { track } from '@/lib/telemetry';
import { NorthlightSite } from '@/northlight/northlight-site';
import { ExtensionUpsell } from './extension-upsell';
import { ResultCard } from './result-card';

const passport = createLocalPassport();

function summary(profile: SIMWPreferences): string {
  const width = 22;
  const rows = PREFERENCE_KEYS.map((key) => {
    const label = VOCABULARY[key].label
      .replace('Interface density', 'Density')
      .replace('Content detail', 'Detail');
    const value =
      (VOCABULARY[key].valueLabels as Record<string, string>)[profile[key]] ?? profile[key];
    return `${label} ${'.'.repeat(Math.max(2, width - label.length))} ${value}`;
  });
  return ['YOUR SEEITMYWAY PROFILE', '', ...rows].join('\n');
}

export function PassportBuilder() {
  const real = useSeeItMyWay();
  const [draft, setDraft] = useState<SIMWPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (real.ready && !loaded) {
      setDraft({ ...DEFAULT_PREFERENCES, ...real.passport });
      setLoaded(true);
    }
  }, [real.ready, real.passport, loaded]);

  const hasSaved = Object.keys(real.passport).length > 0;
  const saved = { ...DEFAULT_PREFERENCES, ...real.passport };
  const dirty = !hasSaved || PREFERENCE_KEYS.some((k) => draft[k] !== saved[k]);

  const { experience, sources } = useMemo(
    () =>
      resolveExperience({
        native: real.detected,
        passport: draft,
        siteDefaults: { visualRichness: 'rich' },
        seed: 'passportpreview0',
        variants: 4,
      }),
    [real.detected, draft],
  );

  const osReducesMotion = real.detected['prefers-reduced-motion'] === 'reduce';
  const deviceDark = real.detected['prefers-color-scheme'] === 'dark';

  const notes: Partial<Record<PreferenceKey, string>> = {
    colorScheme: `Your device currently says ${deviceDark ? 'dark' : 'light'}.`,
    motion: osReducesMotion
      ? 'Your device asks for reduced motion, and that always wins.'
      : undefined,
    autoplay: osReducesMotion ? 'Off while your device asks for reduced motion.' : undefined,
    textSize:
      real.detected['default-font-size'] && real.detected['default-font-size'] !== 'standard'
        ? 'Your browser’s default text size already applies; this adds to it.'
        : undefined,
  };
  const disabled: Partial<Record<PreferenceKey, string[]>> = osReducesMotion
    ? { motion: ['full'], autoplay: ['allowed', 'muted'] }
    : {};

  const set = <K extends PreferenceKey>(key: K, value: PreferenceValue<K>) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setJustSaved(false);
  };

  const save = () => {
    passport.write(draft);
    setJustSaved(true);
    track('passport_saved', {});
  };

  return (
    <div className="mx-auto max-w-[90rem] space-y-20 px-4 pb-10 pt-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[26rem_1fr]">
        <div className="space-y-6">
          <div>
            <p className="eyebrow">No extension. No account.</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Build your SeeItMyWay Passport
            </h1>
            <p className="mt-3 text-muted">
              Set how you like the web. Your profile is stored on this device only, and this site
              starts following it the moment you save.
            </p>
          </div>

          <div className="card space-y-5 p-5">
            {PREFERENCE_KEYS.map((key) => (
              <PreferenceControl
                key={key}
                prefKey={key}
                value={draft[key]}
                onChange={(v) => set(key, v)}
                disabledValues={(disabled[key] ?? []) as PreferenceValue<typeof key>[]}
                note={notes[key]}
                size="sm"
              />
            ))}
          </div>

          <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-surface p-3 shadow-lg">
            <button
              type="button"
              className="btn btn-primary flex-1"
              onClick={save}
              disabled={!dirty}
            >
              {hasSaved ? 'Save changes' : 'Save my Passport'}
            </button>
            {hasSaved ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  passport.clear();
                  setDraft(DEFAULT_PREFERENCES);
                  setJustSaved(false);
                }}
              >
                Clear
              </button>
            ) : null}
            <p className="w-full text-center text-xs text-muted" role="status">
              {justSaved
                ? '✓ Saved on this device. This site is now following it.'
                : dirty
                  ? 'Not saved yet. The preview shows your draft.'
                  : '✓ Saved on this device.'}
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-display text-2xl font-semibold">
            Here&rsquo;s what a compatible website could do with that.
          </h2>
          <NorthlightSite
            experience={experience}
            sources={sources}
            annotate
            framed={{ height: 'min(46rem, calc(100dvh - 11rem))' }}
          />
        </div>
      </div>

      <section aria-labelledby="profile-title" className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 id="profile-title" className="sr-only">
            Your profile
          </h2>
          <pre className="overflow-x-auto font-mono text-sm leading-relaxed">{summary(draft)}</pre>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">This is everything a website would receive</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-surface-2 p-4 font-mono text-sm">
            {JSON.stringify(filterForSharing(draft), null, 2)}
          </pre>
          <p className="mt-3 text-sm text-muted">
            No name, no ID, no history, no list of sites you&rsquo;ve visited. Just coarse choices
            that thousands of other people share too.
          </p>
        </div>
      </section>

      <ResultCard profile={draft} />
      <ExtensionUpsell hasProfile={hasSaved} />
    </div>
  );
}
