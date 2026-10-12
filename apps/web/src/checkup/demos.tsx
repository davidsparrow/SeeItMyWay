'use client';

import type { Experience } from '@simw/protocol';
import { SegmentedControl } from '@simw/ui';
import { type CSSProperties, type ReactNode, useState } from 'react';
import type { DemoKind } from '@/content/topics';
import { NorthlightSite } from '@/northlight/northlight-site';

const MINI_HEIGHT = 330;

function DemoShell({
  controls,
  caption,
  children,
}: {
  controls: ReactNode;
  caption: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      {controls}
      {children}
      <p className="text-sm text-muted">{caption}</p>
    </div>
  );
}

function MotionDemo({ base }: { base: Experience }) {
  const prefersLess = base.motion !== 'full';
  const [mode, setMode] = useState<'full' | 'reduced'>(prefersLess ? 'reduced' : 'full');
  const [run, setRun] = useState(0);
  return (
    <DemoShell
      controls={
        <div className="flex flex-wrap items-end gap-3">
          <SegmentedControl
            label="Show"
            hideLabel
            value={mode}
            onChange={(v) => {
              setMode(v);
              setRun((r) => r + 1);
            }}
            options={[
              {
                value: 'full',
                label: prefersLess ? 'Full motion (moves a lot)' : 'Current experience',
              },
              { value: 'reduced', label: prefersLess ? 'Your experience' : 'Show reduced motion' },
            ]}
            className="min-w-[15rem] flex-1"
          />
          <button type="button" className="btn btn-secondary" onClick={() => setRun((r) => r + 1)}>
            ↻ Replay
          </button>
        </div>
      }
      caption={
        mode === 'full'
          ? 'Cards fly, spin and drift into place, and the background slides behind them.'
          : 'Websites that support your motion preference can automatically choose something closer to this.'
      }
    >
      <div
        key={run}
        className="motion-stage"
        data-mode={mode}
        data-simw-essential-motion=""
        aria-hidden
      >
        <div className="motion-stage-bg" />
        <div className="motion-cards">
          {[0, 1, 2].map((i) => (
            <div key={i} className="motion-card" style={{ '--i': i } as CSSProperties}>
              <span />
              <span />
            </div>
          ))}
        </div>
      </div>
    </DemoShell>
  );
}

function ToggleSite<T extends string>({
  base,
  label,
  options,
  initial,
  patch,
  sections,
  caption,
  className,
  simulate,
}: {
  base: Experience;
  label: string;
  options: Array<{ value: T; label: string }>;
  initial: T;
  patch: (value: T) => Partial<Experience>;
  sections: Parameters<typeof NorthlightSite>[0]['sections'];
  caption: (value: T) => ReactNode;
  className?: string;
  simulate?: (value: T) => Parameters<typeof NorthlightSite>[0]['simulate'];
}) {
  const [value, setValue] = useState<T>(initial);
  return (
    <DemoShell
      controls={
        <SegmentedControl
          label={label}
          hideLabel
          value={value}
          onChange={setValue}
          options={options}
        />
      }
      caption={caption(value)}
    >
      <NorthlightSite
        experience={{ ...base, ...patch(value) }}
        sections={sections}
        framed={{ height: MINI_HEIGHT }}
        className={className}
        simulate={simulate?.(value)}
      />
    </DemoShell>
  );
}

function TextSizeDemo() {
  const [size, setSize] = useState<'16' | '20' | '24'>('16');
  return (
    <DemoShell
      controls={
        <SegmentedControl
          label="Default text size"
          hideLabel
          value={size}
          onChange={setSize}
          options={[
            { value: '16', label: '16px · standard' },
            { value: '20', label: '20px · large' },
            { value: '24', label: '24px · very large' },
          ]}
        />
      }
      caption="A considerate site sizes text relative to your default, so the whole page grows with it and still fits."
    >
      <div
        className="rounded-2xl border border-line bg-surface p-5"
        style={{ fontSize: `${size}px` }}
      >
        <p className="font-display text-[1.4em] font-semibold leading-tight">
          Why do stars twinkle?
        </p>
        <p className="mt-[0.5em] text-[1em] leading-relaxed text-muted">
          Starlight arrives as a single point, so every ripple in our atmosphere makes it flicker.
          Planets are close enough to be tiny discs, and the flickers average out.
        </p>
      </div>
    </DemoShell>
  );
}

export function SignalDemo({ kind, base }: { kind: DemoKind; base: Experience }) {
  switch (kind) {
    case 'motion':
      return <MotionDemo base={base} />;
    case 'appearance':
      return (
        <ToggleSite
          base={base}
          label="Appearance"
          options={[
            { value: 'light', label: '☀️ Light' },
            { value: 'dark', label: '🌙 Dark' },
          ]}
          initial={base.colorScheme === 'dark' ? 'light' : 'dark'}
          patch={(v) => ({ colorScheme: v })}
          sections={['nav', 'hero', 'tonight']}
          caption={() =>
            'The same mini-site, responding to the light or dark request. Not just inverted: a night sky and a dawn sky.'
          }
        />
      );
    case 'contrast':
      return (
        <ToggleSite
          base={base}
          label="Contrast"
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'more', label: 'More contrast' },
          ]}
          initial={base.contrast === 'more' ? 'standard' : 'more'}
          patch={(v) => ({ contrast: v, variant: null })}
          sections={['nav', 'hero', 'tonight']}
          caption={(v) =>
            v === 'more'
              ? 'Pale greys darken, edges sharpen, and text gets a solid backing instead of sitting on imagery.'
              : 'The site’s standard design.'
          }
        />
      );
    case 'transparency':
      return (
        <ToggleSite
          base={{ ...base, contrast: 'standard' }}
          label="Transparency"
          options={[
            { value: 'standard', label: 'Glassy' },
            { value: 'reduced', label: 'Solid' },
          ]}
          initial={base.transparency === 'reduced' ? 'standard' : 'reduced'}
          patch={(v) => ({ transparency: v })}
          sections={['nav', 'hero']}
          className="nl-overlay-nav"
          caption={(v) =>
            v === 'reduced'
              ? 'An opaque menu bar: nothing shows through behind the text.'
              : 'A frosted-glass menu bar with the sky showing through.'
          }
        />
      );
    case 'forced-colors':
      return (
        <ToggleSite
          base={base}
          label="Colors"
          options={[
            { value: 'site', label: 'Site colors' },
            { value: 'forced', label: 'Forced colors' },
          ]}
          initial="forced"
          patch={() => ({})}
          sections={['nav', 'hero', 'tonight']}
          simulate={(v) => ({ forcedColors: v === 'forced' })}
          caption={() =>
            'An approximation. The real mode is drawn by your device, which replaces every color with your chosen palette.'
          }
        />
      );
    case 'inverted-colors':
      return (
        <ToggleSite
          base={base}
          label="Colors"
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'inverted', label: 'Inverted' },
          ]}
          initial="inverted"
          patch={() => ({})}
          sections={['nav', 'hero']}
          simulate={(v) => ({ invertedColors: v === 'inverted' })}
          caption={() =>
            'A site that listens can flip photos back so they don’t look like film negatives.'
          }
        />
      );
    case 'text-size':
      return <TextSizeDemo />;
    case 'data':
      return (
        <ToggleSite
          base={base}
          label="Data"
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'reduced', label: 'Data saver' },
          ]}
          initial={base.data === 'reduced' ? 'standard' : 'reduced'}
          patch={(v) => (v === 'reduced' ? { data: 'reduced' } : { data: 'standard' })}
          sections={['timelapse']}
          caption={(v) =>
            v === 'reduced'
              ? 'The 18 MB timelapse waits until you ask for it.'
              : 'The timelapse loads straight away.'
          }
        />
      );
    case 'interaction':
      return (
        <ToggleSite
          base={base}
          label="Device"
          options={[
            { value: 'mouse', label: '🖱️ Mouse' },
            { value: 'touch', label: '👆 Touch' },
          ]}
          initial={base.pointer === 'coarse' ? 'mouse' : 'touch'}
          patch={(v) =>
            v === 'touch' ? { pointer: 'coarse', hover: false } : { pointer: 'fine', hover: true }
          }
          sections={['tonight']}
          caption={(v) =>
            v === 'touch'
              ? 'No hover on a touchscreen, so tips are shown right on the card, and buttons get bigger.'
              : 'With a mouse, extra tips can wait behind a small "i" until you point at them.'
          }
        />
      );
  }
}
