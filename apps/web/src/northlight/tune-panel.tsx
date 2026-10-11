'use client';

import type { AnonymousEventProps } from '@simw/privacy';
import {
  type ExperienceKey,
  type Layer,
  PRECEDENCE,
  type PreferenceKey,
  type PreferenceValue,
  VOCABULARY,
} from '@simw/protocol';
import type { SeeItMyWay, SeeItMyWayState } from '@simw/sdk';
import { Disclosure, PreferenceControl, ScaleControl } from '@simw/ui';
import { useState } from 'react';
import { track } from '@/lib/telemetry';
import { ENVIRONMENT_LABELS, ENVIRONMENTS, type Tone } from './content';

const LAYER_LABEL: Record<Layer, string> = {
  ...(Object.fromEntries(PRECEDENCE.map((p) => [p.layer, p.label])) as Record<Layer, string>),
  'protocol-default': 'Default',
};

const WHY_ROWS: Array<[ExperienceKey, string]> = [
  ['colorScheme', 'Theme'],
  ['motion', 'Motion'],
  ['autoplay', 'Autoplay'],
  ['density', 'Density'],
  ['textSize', 'Text size'],
  ['visualRichness', 'Visual richness'],
  ['detail', 'Content detail'],
  ['instructions', 'Instructions'],
  ['navigation', 'Navigation'],
  ['captions', 'Captions'],
  ['controls', 'Controls'],
  ['contrast', 'Contrast'],
  ['transparency', 'Transparency'],
  ['pointer', 'Input (device)'],
  ['variant', 'Variation'],
];

const DETAIL_STOPS = [
  { value: 'brief', detail: 'brief', instructions: 'concise', label: 'Concise' },
  { value: 'standard', detail: 'standard', instructions: 'standard', label: 'Standard' },
  { value: 'detailed', detail: 'detailed', instructions: 'step-by-step', label: 'Detailed' },
] as const;

export function TunePanel({
  sdk,
  state,
  tone,
  onTone,
}: {
  sdk: SeeItMyWay;
  state: SeeItMyWayState;
  tone: Tone;
  onTone: (tone: Tone) => void;
}) {
  const [open, setOpen] = useState(false);
  const exp = state.experience;
  const osReducesMotion = state.detected['prefers-reduced-motion'] === 'reduce';

  const set = <K extends PreferenceKey>(
    key: K,
    value: PreferenceValue<K>,
    control: AnonymousEventProps<'demo_tuned'>['control'] = key,
  ) => {
    sdk.setOverride(key, value);
    track('demo_tuned', { control }, { oncePerPage: true });
  };

  const valueText = (key: ExperienceKey): string => {
    const v = exp[key];
    if (key === 'variant')
      return v === null
        ? 'Off'
        : ENVIRONMENT_LABELS[ENVIRONMENTS[(v as number) % ENVIRONMENTS.length] ?? 'observatory'];
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (key in VOCABULARY)
      return (
        (VOCABULARY[key as PreferenceKey].valueLabels as Record<string, string>)[v as string] ??
        String(v)
      );
    return String(v);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="tune-panel"
        className="btn btn-primary fixed bottom-5 right-5 z-50 shadow-xl"
      >
        ✨ {open ? 'Close' : 'Tune this site'}
      </button>
      {open ? (
        <aside
          id="tune-panel"
          aria-label="Tune this site"
          className="fixed bottom-20 right-3 z-50 max-h-[calc(100dvh-7rem)] w-[min(26rem,calc(100vw-1.5rem))] overflow-y-auto rounded-3xl border border-line bg-surface p-5 text-ink shadow-2xl pop"
        >
          <p className="eyebrow">See it my way</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Tune this site</h2>
          <p className="mt-1 text-sm text-muted">
            Changes apply to Northlight only and stay on this device. Your device&rsquo;s
            accessibility settings always win.
          </p>

          <div className="mt-5 space-y-4">
            <ScaleControl
              label="Motion"
              poles={['Calmer', 'Livelier']}
              value={exp.motion}
              options={[
                { value: 'minimal', label: 'Minimal' },
                { value: 'reduced', label: 'Reduced' },
                { value: 'full', label: 'Full', disabled: osReducesMotion },
              ]}
              onChange={(v) => set('motion', v, 'liveliness')}
              note={
                osReducesMotion
                  ? 'Your device asks for reduced motion, so this site won’t go livelier.'
                  : undefined
              }
            />
            <ScaleControl
              label="Visual richness"
              poles={['Minimal', 'Rich']}
              value={exp.visualRichness}
              options={VOCABULARY.visualRichness.values.map((v) => ({
                value: v,
                label: VOCABULARY.visualRichness.valueLabels[v],
              }))}
              onChange={(v) => set('visualRichness', v, 'richness')}
            />
            <ScaleControl
              label="Density"
              poles={['Compact', 'Roomy']}
              value={exp.density}
              options={VOCABULARY.density.values.map((v) => ({
                value: v,
                label: VOCABULARY.density.valueLabels[v],
              }))}
              onChange={(v) => set('density', v, 'roominess')}
            />
            <ScaleControl
              label="Detail"
              poles={['Concise', 'Detailed']}
              value={exp.detail}
              options={DETAIL_STOPS.map((s) => ({ value: s.value, label: s.label }))}
              onChange={(v) => {
                const stop = DETAIL_STOPS.find((s) => s.value === v);
                if (!stop) return;
                sdk.setOverrides({
                  ...state.overrides,
                  detail: stop.detail,
                  instructions: stop.instructions,
                });
                track('demo_tuned', { control: 'detail' }, { oncePerPage: true });
              }}
            />
            <ScaleControl
              label="Tone"
              poles={['Serious', 'Playful']}
              value={tone}
              options={[
                { value: 'serious', label: 'Serious' },
                { value: 'balanced', label: 'Balanced' },
                { value: 'playful', label: 'Playful' },
              ]}
              onChange={(v) => {
                onTone(v);
                track('demo_tuned', { control: 'tone' }, { oncePerPage: true });
              }}
              note="Tone is Northlight’s own setting. Sites can add their own on top of the shared vocabulary."
            />
          </div>

          <Disclosure summary="More settings" className="mt-5">
            <div className="space-y-4">
              <PreferenceControl
                prefKey="colorScheme"
                value={state.overrides.colorScheme ?? state.passport.colorScheme ?? 'system'}
                onChange={(v) => set('colorScheme', v)}
                size="sm"
              />
              <PreferenceControl
                prefKey="textSize"
                value={exp.textSize}
                onChange={(v) => set('textSize', v)}
                size="sm"
              />
              <PreferenceControl
                prefKey="navigation"
                value={exp.navigation}
                onChange={(v) => set('navigation', v)}
                size="sm"
              />
              <PreferenceControl
                prefKey="autoplay"
                value={exp.autoplay}
                onChange={(v) => set('autoplay', v)}
                disabledValues={osReducesMotion ? ['allowed', 'muted'] : []}
                note={
                  osReducesMotion ? 'Off while your device asks for reduced motion.' : undefined
                }
                size="sm"
              />
              <PreferenceControl
                prefKey="captions"
                value={exp.captions}
                onChange={(v) => set('captions', v)}
                size="sm"
              />
              <PreferenceControl
                prefKey="controls"
                value={exp.controls}
                onChange={(v) => set('controls', v)}
                size="sm"
              />
            </div>
          </Disclosure>

          <Disclosure summary="Why does it look like this?" className="mt-3">
            <p className="mb-3 text-xs text-muted">
              Highest priority first: your device, then this site&rsquo;s Tune settings, then your
              Passport, then the site&rsquo;s design.
            </p>
            <table className="w-full text-left text-sm">
              <tbody>
                {WHY_ROWS.map(([key, label]) => (
                  <tr key={key} className="border-t border-line">
                    <th scope="row" className="py-1.5 pr-2 font-medium text-muted">
                      {label}
                    </th>
                    <td className="py-1.5 pr-2">{valueText(key)}</td>
                    <td className="py-1.5 text-right text-xs text-muted">
                      {LAYER_LABEL[state.sources[key]]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Disclosure>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
            <span>
              <span className="font-semibold">Anonymous variation:</span> {valueText('variant')}
            </span>
            <button
              type="button"
              className="btn btn-ghost !min-h-9 !px-3 text-sm"
              onClick={() => sdk.shuffleSeed()}
            >
              Shuffle
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">
            A random number stored only for this site, so its decoration stays consistent between
            visits. It says nothing about you, and it switches off when you ask for more contrast.
          </p>

          <button
            type="button"
            className="btn btn-secondary mt-4 w-full"
            onClick={() => sdk.resetOverrides()}
          >
            Reset this site to my defaults
          </button>
        </aside>
      ) : null}
    </>
  );
}
