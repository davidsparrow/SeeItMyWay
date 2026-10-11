'use client';

import { buildResultCardItems } from '@simw/privacy';
import {
  PREFERENCE_KEYS,
  type PreferenceKey,
  type SIMWPreferences,
  VOCABULARY,
} from '@simw/protocol';
import { safeLocalStorage } from '@simw/sdk';
import { useEffect, useState } from 'react';
import { CARD_FOOTER, CARD_TITLE, cardPhrase } from '@/content/card';
import { CHECKUP_KEYS } from '@/lib/site';
import { track } from '@/lib/telemetry';

const W = 1080;
const H = 1350;

function drawCard(lines: string[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = '#14131c';
  ctx.fillRect(0, 0, W, H);
  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(20,19,28,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(180, 120, 700, 'rgba(117,99,255,0.55)');
  glow(980, 1250, 650, 'rgba(255,138,92,0.45)');

  ctx.fillStyle = '#f1efe9';
  ctx.font = '600 104px ui-serif, "New York", Georgia, serif';
  ctx.fillText(CARD_TITLE, 96, 250);

  ctx.font = '600 58px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
  const top = 400;
  const gap = Math.min(110, (H - top - 220) / Math.max(lines.length, 1));
  lines.forEach((line, i) => {
    ctx.fillText(line, 96, top + i * gap);
  });

  ctx.fillStyle = '#b8adff';
  ctx.font = '600 40px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillText(CARD_FOOTER, 96, H - 110);
  return canvas;
}

/**
 * Addendum E: a shareable, non-identifying card. Nothing goes on it unless
 * the visitor ticks it, and device or browser characteristics can't go on it
 * at all.
 */
export function ResultCard({ profile }: { profile: SIMWPreferences }) {
  const [chosen, setChosen] = useState<PreferenceKey[]>([]);
  const [status, setStatus] = useState('');
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    try {
      const saved: unknown = JSON.parse(safeLocalStorage().get(CHECKUP_KEYS.cardChoices) ?? '[]');
      if (Array.isArray(saved))
        setChosen(saved.filter((k): k is PreferenceKey => PREFERENCE_KEYS.includes(k)));
    } catch {
      // ignore corrupt local data
    }
  }, []);

  const toggle = (key: PreferenceKey) => {
    const next = chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key];
    setChosen(next);
    safeLocalStorage().set(CHECKUP_KEYS.cardChoices, JSON.stringify(next));
  };

  const lines = buildResultCardItems(profile, chosen).map((item) =>
    cardPhrase(item.key, item.value),
  );
  const text = `${CARD_TITLE}\n\n${lines.join('\n')}\n\n${CARD_FOOTER}`;

  const download = () => {
    drawCard(lines).toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-web-wants.png';
      a.click();
      URL.revokeObjectURL(url);
      track('result_card_shared', { method: 'download' });
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied.');
      track('result_card_shared', { method: 'copy' });
    } catch {
      setStatus('Couldn’t copy. Select the text on the card instead.');
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: CARD_TITLE, text });
      track('result_card_shared', { method: 'share' });
    } catch {
      // Cancelled; nothing to do.
    }
  };

  return (
    <section
      aria-labelledby="card-title"
      className="grid gap-8 md:grid-cols-[1fr_minmax(0,24rem)] md:items-start"
    >
      <div>
        <p className="eyebrow">Share it, if you like</p>
        <h2
          id="card-title"
          className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Your &ldquo;My Web Wants&rdquo; card
        </h2>
        <p className="mt-2 max-w-xl text-muted">
          Tick what you&rsquo;d like on it. Nothing is included unless you choose it, and nothing
          about your device ever is.
        </p>
        <fieldset className="mt-5 flex flex-wrap gap-2">
          <legend className="sr-only">Preferences to include on the card</legend>
          {PREFERENCE_KEYS.map((key) => {
            const on = chosen.includes(key);
            return (
              <label
                key={key}
                className={`inline-flex min-h-[max(var(--simw-target-size,36px),2.5rem)] cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-semibold ${
                  on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface'
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(key)}
                  className="size-4 accent-[var(--accent)]"
                />
                {VOCABULARY[key].label}
              </label>
            );
          })}
        </fieldset>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-primary"
            disabled={lines.length === 0}
            onClick={download}
          >
            Download image
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={lines.length === 0}
            onClick={copy}
          >
            Copy text
          </button>
          {canShare ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={lines.length === 0}
              onClick={share}
            >
              Share…
            </button>
          ) : null}
        </div>
        <p className="mt-2 min-h-5 text-sm text-muted" role="status">
          {status}
        </p>
      </div>

      <figure
        aria-label="Card preview"
        className="relative aspect-[4/5] overflow-hidden rounded-[2rem] p-8 text-[#f1efe9] shadow-2xl"
        style={{
          background:
            'radial-gradient(70% 55% at 10% 5%, rgba(117,99,255,0.55), transparent 70%), radial-gradient(65% 55% at 95% 100%, rgba(255,138,92,0.45), transparent 70%), #14131c',
        }}
      >
        <p className="font-display text-4xl font-semibold">{CARD_TITLE}</p>
        {lines.length > 0 ? (
          <ul className="mt-6 space-y-2.5 text-xl font-semibold">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-lg opacity-70">Tick a preference to add it.</p>
        )}
        <figcaption className="absolute bottom-7 left-8 text-sm font-semibold text-[#b8adff]">
          {CARD_FOOTER}
        </figcaption>
      </figure>
    </section>
  );
}
