'use client';

import type { AnonymousEventProps } from '@simw/privacy';
import {
  type PartialPreferences,
  PREFERENCE_KEYS,
  type PreferenceKey,
  type PreferenceValue,
  resolveExperience,
} from '@simw/protocol';
import { useSeeItMyWay } from '@simw/sdk/react';
import type { NativeSnapshot } from '@simw/types';
import { Badge, PreferenceControl, SegmentedControl, Switch } from '@simw/ui';
import { useEffect, useState } from 'react';
import { constraintNote } from '@/content/constraints';
import { track } from '@/lib/telemetry';
import { ENVIRONMENT_SHORT, ENVIRONMENTS, type Tone } from '@/northlight/content';
import { NorthlightSite } from '@/northlight/northlight-site';

interface NativeSim {
  motion: 'full' | 'reduced' | 'minimal';
  theme: 'light' | 'dark';
  contrast: 'standard' | 'more';
  transparency: 'standard' | 'reduced';
  input: 'mouse' | 'touch';
}

const EXTENDED_KEYS = PREFERENCE_KEYS.filter((k) => k !== 'colorScheme' && k !== 'motion');

function simFrom(detected: NativeSnapshot): NativeSim {
  return {
    motion: detected['prefers-reduced-motion'] === 'reduce' ? 'reduced' : 'full',
    theme: detected['prefers-color-scheme'] === 'dark' ? 'dark' : 'light',
    contrast: detected['prefers-contrast'] === 'more' ? 'more' : 'standard',
    transparency: detected['prefers-reduced-transparency'] === 'reduce' ? 'reduced' : 'standard',
    input: detected.pointer === 'coarse' ? 'touch' : 'mouse',
  };
}

export function Playground() {
  const real = useSeeItMyWay();
  const [sim, setSim] = useState<NativeSim | null>(null);
  const [extended, setExtended] = useState<PartialPreferences>({});
  const [annotate, setAnnotate] = useState(true);
  const [tone, setTone] = useState<Tone>('balanced');
  const [variant, setVariant] = useState(0);

  // Start from what this browser says right now (once; later edits are the visitor's).
  useEffect(() => {
    if (real.ready) setSim((s) => s ?? simFrom(real.detected));
  }, [real.ready, real.detected]);

  const current = sim ?? simFrom(real.detected);
  const resolution = resolveExperience({
    native: {
      ...real.detected,
      'prefers-reduced-motion': current.motion === 'full' ? 'no-preference' : 'reduce',
      'prefers-color-scheme': current.theme,
      'prefers-contrast': current.contrast === 'more' ? 'more' : 'no-preference',
      'prefers-reduced-transparency':
        current.transparency === 'reduced' ? 'reduce' : 'no-preference',
      pointer: current.input === 'touch' ? 'coarse' : 'fine',
      hover: current.input === 'touch' ? 'none' : 'hover',
    },
    siteOverrides: { ...extended, ...(current.motion === 'minimal' ? { motion: 'minimal' } : {}) },
    siteDefaults: { visualRichness: 'rich' },
    seed: 'playground000000',
    variants: ENVIRONMENTS.length,
  });
  const { experience, sources, stated } = resolution;
  const shown = { ...experience, variant: experience.variant === null ? null : variant };

  const note = (control: AnonymousEventProps<'playground_changed'>['control']) =>
    track('playground_changed', { control }, { oncePerPage: true });

  const setNative = <K extends keyof NativeSim>(key: K, value: NativeSim[K]) => {
    setSim({ ...current, [key]: value });
    note(key === 'theme' ? 'colorScheme' : key === 'input' ? 'pointer' : key);
  };

  const setPref = <K extends PreferenceKey>(key: K, value: PreferenceValue<K>) => {
    setExtended((e) => ({ ...e, [key]: value }));
    note(key);
  };

  return (
    <div className="mx-auto grid max-w-[90rem] gap-8 px-4 pb-10 pt-10 sm:px-6 lg:grid-cols-[24rem_1fr]">
      <div className="space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-2">
        <div>
          <p className="eyebrow">Preference Playground</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            See the difference
          </h1>
          <p className="mt-2 text-muted">
            Flip a setting and watch the same website respond. We&rsquo;ve started you at what your
            browser says right now.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-warn-soft px-3 py-1 text-sm font-semibold text-warn">
            Preview only: this does not change your device settings.
          </p>
        </div>

        <section className="card space-y-4 p-5" aria-labelledby="pg-native">
          <div className="flex items-center justify-between gap-2">
            <h2 id="pg-native" className="font-semibold">
              What your browser can say today
            </h2>
            <Badge tone="accent">Built in</Badge>
          </div>
          <SegmentedControl
            label="Motion"
            value={current.motion}
            onChange={(v) => setNative('motion', v)}
            options={[
              { value: 'full', label: 'Full' },
              { value: 'reduced', label: 'Reduced' },
              { value: 'minimal', label: 'Minimal' },
            ]}
            size="sm"
          />
          <SegmentedControl
            label="Theme"
            value={current.theme}
            onChange={(v) => setNative('theme', v)}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            size="sm"
          />
          <SegmentedControl
            label="Contrast"
            value={current.contrast}
            onChange={(v) => setNative('contrast', v)}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'more', label: 'Higher' },
            ]}
            size="sm"
          />
          <SegmentedControl
            label="Transparency"
            value={current.transparency}
            onChange={(v) => setNative('transparency', v)}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'reduced', label: 'Reduced' },
            ]}
            size="sm"
          />
          <SegmentedControl
            label="Device (not a preference)"
            value={current.input}
            onChange={(v) => setNative('input', v)}
            options={[
              { value: 'mouse', label: '🖱️ Mouse' },
              { value: 'touch', label: '👆 Touch' },
            ]}
            size="sm"
          />
        </section>

        <section className="card space-y-4 p-5" aria-labelledby="pg-extended">
          <div className="flex items-center justify-between gap-2">
            <h2 id="pg-extended" className="font-semibold">
              What SeeItMyWay adds
            </h2>
            <Badge tone="good">Proposed</Badge>
          </div>
          <p className="text-sm text-muted">
            Browsers don&rsquo;t carry these between websites yet. A participating site could honor
            them all.
          </p>
          {EXTENDED_KEYS.map((key) => (
            <PreferenceControl
              key={key}
              prefKey={key}
              value={(extended[key] ?? stated[key]) as PreferenceValue<typeof key>}
              onChange={(v) => setPref(key, v)}
              note={constraintNote(key, resolution, {
                lead: 'Set to',
                device: 'This preview’s device',
              })}
              showDescription={false}
              size="sm"
            />
          ))}
        </section>

        <section className="card space-y-4 p-5" aria-labelledby="pg-site">
          <h2 id="pg-site" className="font-semibold">
            Northlight&rsquo;s own touches
          </h2>
          <SegmentedControl
            label="Tone (a site-specific setting)"
            value={tone}
            onChange={setTone}
            options={[
              { value: 'serious', label: 'Serious' },
              { value: 'balanced', label: 'Balanced' },
              { value: 'playful', label: 'Playful' },
            ]}
            size="sm"
          />
          <SegmentedControl
            label="Anonymous variation"
            value={String(variant)}
            onChange={(v) => setVariant(Number(v))}
            options={ENVIRONMENTS.map((env, i) => ({
              value: String(i),
              label: ENVIRONMENT_SHORT[env],
            }))}
            description={
              shown.variant === null
                ? 'Switched off: decoration never competes with a contrast request.'
                : 'Harmless decoration picked by a random number. It never overrides a preference.'
            }
            size="sm"
          />
          <Switch label="Show what adapted" checked={annotate} onChange={setAnnotate} />
        </section>

        <button
          type="button"
          className="btn btn-secondary w-full"
          onClick={() => {
            setSim(simFrom(real.detected));
            setExtended({});
          }}
        >
          Back to my real settings
        </button>
      </div>

      <div className="min-w-0">
        <NorthlightSite
          experience={shown}
          sources={sources}
          tone={tone}
          annotate={annotate}
          framed={{ height: 'min(52rem, calc(100dvh - 8rem))' }}
        />
        <p className="mt-3 text-center text-sm text-muted">
          Like what you see?{' '}
          <a
            href="/passport"
            className="font-semibold text-accent underline-offset-4 hover:underline"
          >
            Save it as your Passport
          </a>{' '}
          and this site will start using it.
        </p>
      </div>
    </div>
  );
}
