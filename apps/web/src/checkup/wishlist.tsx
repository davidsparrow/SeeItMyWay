'use client';

import { WISHLIST_CANDIDATES, type WishlistCandidateId } from '@simw/protocol';
import { safeLocalStorage } from '@simw/sdk';
import { type FormEvent, useEffect, useState } from 'react';
import { CHECKUP_KEYS } from '@/lib/site';
import { track } from '@/lib/telemetry';

function readVotes(): WishlistCandidateId[] {
  try {
    const parsed: unknown = JSON.parse(safeLocalStorage().get(CHECKUP_KEYS.wishlist) ?? '[]');
    const valid = new Set<string>(WISHLIST_CANDIDATES.map((c) => c.id));
    return Array.isArray(parsed)
      ? (parsed.filter((v) => valid.has(v)) as WishlistCandidateId[])
      : [];
  } catch {
    return [];
  }
}

/**
 * Addendum D: let visitors vote on what browsers should let them say. The
 * vocabulary should come from demonstrated demand.
 */
export function Wishlist() {
  const [votes, setVotes] = useState<WishlistCandidateId[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [suggested, setSuggested] = useState(false);

  useEffect(() => setVotes(readVotes()), []);

  const toggle = (id: WishlistCandidateId) => {
    const next = votes.includes(id) ? votes.filter((v) => v !== id) : [...votes, id];
    if (!votes.includes(id)) track('wishlist_voted', { item: id }, { oncePerPage: true });
    setVotes(next);
    safeLocalStorage().set(CHECKUP_KEYS.wishlist, JSON.stringify(next));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = suggestion.trim();
    if (!text) return;
    // The text stays on this device: free text can contain anything, so it is never sent as an event.
    const store = safeLocalStorage();
    let existing: unknown = [];
    try {
      existing = JSON.parse(store.get(CHECKUP_KEYS.suggestions) ?? '[]');
    } catch {
      // Corrupt local data: start over.
    }
    store.set(
      CHECKUP_KEYS.suggestions,
      JSON.stringify([...(Array.isArray(existing) ? existing : []), text].slice(-20)),
    );
    track('wishlist_suggested', {});
    setSuggestion('');
    setSuggested(true);
  };

  return (
    <section aria-labelledby="wishlist-title" className="mx-auto max-w-6xl px-4 sm:px-6">
      <p className="eyebrow">Help design the protocol</p>
      <h2
        id="wishlist-title"
        className="mt-2 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        What should your browser let you tell websites?
      </h2>
      <p className="mt-2 max-w-2xl text-muted">
        Pick as many as you like. The preferences people actually want should decide what goes into
        the standard, not us.
      </p>
      <fieldset className="mt-6 flex min-w-0 flex-wrap gap-2">
        <legend className="sr-only">Preferences you want</legend>
        {WISHLIST_CANDIDATES.map((c) => {
          const on = votes.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c.id)}
              className={`inline-flex min-h-[max(var(--simw-target-size,36px),2.75rem)] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                on
                  ? 'border-accent bg-accent text-on-accent'
                  : 'border-line bg-surface hover:bg-surface-2'
              }`}
            >
              <span aria-hidden>{on ? '✓' : c.emoji}</span>
              {c.label}
            </button>
          );
        })}
      </fieldset>
      <form onSubmit={submit} className="mt-5 flex max-w-xl flex-wrap gap-2">
        <label htmlFor="wish-suggest" className="sr-only">
          Suggest another preference
        </label>
        <input
          id="wish-suggest"
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="Suggest another…"
          maxLength={120}
          className="min-h-11 flex-1 rounded-full border border-line bg-surface px-4 text-ink placeholder:text-muted"
        />
        <button type="submit" className="btn btn-secondary">
          Suggest
        </button>
      </form>
      <p className="mt-3 text-sm text-muted" role="status">
        {suggested
          ? 'Thanks. For now your suggestion stays on this device: free text is never sent automatically.'
          : votes.length > 0
            ? `${votes.length} picked. Votes are anonymous, and results appear once enough people have voted.`
            : 'Votes are anonymous. No account, no ID.'}
      </p>
    </section>
  );
}
