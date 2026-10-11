import { PREFERENCE_KEYS, WISHLIST_CANDIDATE_IDS } from '@simw/protocol';
import { NATIVE_SIGNAL_IDS, NATIVE_VALUES } from '@simw/types';

/**
 * Anonymous event allowlist (PRD Addendum H, §29).
 *
 * Every property is a closed enum or a small bounded integer. No free text,
 * no identifiers, no timestamps finer than the sink chooses, no URLs. Events
 * are never linked to each other. If an event or property isn't listed
 * here, it can't be recorded.
 */

type IntRange = { readonly int: readonly [min: number, max: number] };
type PropSpec = readonly string[] | IntRange;

const SIGNALS = NATIVE_SIGNAL_IDS;
const NATIVE_VALUE_SET = [...new Set(Object.values(NATIVE_VALUES).flat())] as string[];
const PLAYGROUND_CONTROLS = [...PREFERENCE_KEYS, 'contrast', 'transparency', 'pointer'] as const;
const TUNE_CONTROLS = [
  'liveliness',
  'richness',
  'roominess',
  'detail',
  'tone',
  ...PREFERENCE_KEYS,
] as const;

/** Preference Awareness Scores, bucketed into quarters before they can be counted. */
export const SCORE_BUCKETS = ['0-24', '25-49', '50-74', '75-100'] as const;
export type ScoreBucket = (typeof SCORE_BUCKETS)[number];

export function scoreBucket(score: number): ScoreBucket {
  if (score >= 75) return '75-100';
  if (score >= 50) return '50-74';
  if (score >= 25) return '25-49';
  return '0-24';
}

export const ANONYMOUS_EVENTS = {
  /** Clicked "Show Me Mine". */
  checkup_started: {},
  /** Reached the end of the reveal. */
  checkup_completed: {},
  signals_detected: { count: { int: [0, 20] } },
  explainer_opened: { signal: SIGNALS },
  demo_viewed: { signal: SIGNALS },
  howto_opened: { signal: SIGNALS },
  recheck_clicked: {},
  /** The most valuable metric: someone changed a real OS/browser setting after learning it exists. */
  preference_changed: { signal: SIGNALS, to: NATIVE_VALUE_SET },
  awareness_answered: {
    signal: SIGNALS,
    question: ['knew_detectable', 'knew_where'],
    answer: ['yes', 'no'],
  },
  raw_signals_opened: {},
  playground_changed: { control: PLAYGROUND_CONTROLS },
  demo_tuned: { control: TUNE_CONTROLS },
  passport_saved: {},
  wishlist_voted: { item: WISHLIST_CANDIDATE_IDS },
  /** The suggestion text itself is never recorded; free text can contain anything. */
  wishlist_suggested: {},
  result_card_shared: { method: ['download', 'copy', 'share'] },
  extension_interest: {},
  owner_test_interest: {},
  /** A Site Listener Test finished. Only the score's quarter: never the URL, never the exact score. */
  owner_test_completed: { score: SCORE_BUCKETS },
} as const satisfies Record<string, Record<string, PropSpec>>;

export type AnonymousEventName = keyof typeof ANONYMOUS_EVENTS;

type PropValue<S> = S extends IntRange ? number : S extends readonly (infer V)[] ? V : never;

export type AnonymousEventProps<N extends AnonymousEventName> = {
  -readonly [P in keyof (typeof ANONYMOUS_EVENTS)[N]]: PropValue<(typeof ANONYMOUS_EVENTS)[N][P]>;
};

export interface AnonymousEvent<N extends AnonymousEventName = AnonymousEventName> {
  name: N;
  props: AnonymousEventProps<N>;
}

export interface AnonymousEventSink {
  record(event: AnonymousEvent): void;
}

// A Set rather than `Object.hasOwn`: this package is bundled into the ES2017 script-tag SDK.
const EVENT_NAMES: ReadonlySet<string> = new Set(Object.keys(ANONYMOUS_EVENTS));

function isIntRange(spec: PropSpec): spec is IntRange {
  return !Array.isArray(spec);
}

/**
 * Returns a clean event, or null if anything about it falls outside the
 * allowlist: an unknown name, a missing or extra property, or a value that
 * isn't one of the permitted ones.
 */
export function sanitizeEvent(
  name: string,
  props: Record<string, unknown> = {},
): AnonymousEvent | null {
  if (!EVENT_NAMES.has(name)) return null;
  const spec = ANONYMOUS_EVENTS[name as AnonymousEventName] as Record<string, PropSpec>;
  const specKeys = Object.keys(spec);
  const givenKeys = Object.keys(props);
  if (givenKeys.length !== specKeys.length) return null;

  const clean: Record<string, string | number> = {};
  for (const [key, rule] of Object.entries(spec)) {
    const value = props[key];
    if (isIntRange(rule)) {
      const [min, max] = rule.int;
      if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
        return null;
      }
      clean[key] = value;
    } else {
      if (typeof value !== 'string' || !rule.includes(value)) return null;
      clean[key] = value;
    }
  }
  return { name: name as AnonymousEventName, props: clean } as AnonymousEvent;
}
