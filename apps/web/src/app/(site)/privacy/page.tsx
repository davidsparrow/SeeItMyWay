import type { Metadata } from 'next';
import { ANONYMOUS_EVENTS, MINIMUM_COHORT, type AnonymousEventName } from '@simw/privacy';
import { LocalData } from './local-data';

export const metadata: Metadata = {
  title: 'Our promise & what we count',
  description: 'We don’t need to know who you are to understand how you like websites to work.',
};

const PROMISE = [
  'We do not need to know who you are to understand how you like websites to work.',
  'Your preferences belong to you.',
  'We do not build advertising profiles from them.',
  'We do not sell them.',
  'We do not infer personal characteristics from them.',
  'We send websites only the preferences necessary to improve your experience.',
  'And you can change or stop sharing them whenever you want.',
];

const EVENT_DESCRIPTIONS: Record<AnonymousEventName, string> = {
  checkup_started: 'Someone clicked "Show me mine"',
  checkup_completed: 'Someone reached the end of the Checkup',
  signals_detected: 'How many signals a browser exposed (a number from 0 to 20)',
  explainer_opened: 'Which signal’s explanation was opened',
  demo_viewed: 'Which signal’s demonstration was viewed',
  howto_opened: 'Which signal’s "how to change this" was opened',
  recheck_clicked: '"Check again" was clicked',
  preference_changed: 'A real setting changed after someone learned about it, and to which value',
  awareness_answered: 'Yes/no answers to "did you know websites could detect this?"',
  raw_signals_opened: 'Someone opened the raw signals',
  playground_changed: 'Which Playground control was used',
  demo_tuned: 'Which Tune control was used on the demo site',
  passport_saved: 'A Passport was saved (not its contents)',
  wishlist_voted: 'Which future preference got a vote',
  wishlist_suggested: 'That a suggestion was made (never its text)',
  result_card_shared: 'How a result card was shared: download, copy or share',
  extension_interest: 'Someone said they’d use the Passport extension',
  owner_test_interest: 'A site owner wanted the Site Listener Test (never the URL)',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-16 px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
      <section>
        <p className="eyebrow">The SeeItMyWay Promise</p>
        <div className="mt-6 space-y-3">
          {PROMISE.map((line, i) => (
            <p
              key={line}
              className={
                i === 0
                  ? 'font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl'
                  : 'text-xl'
              }
            >
              {line}
            </p>
          ))}
        </div>
      </section>

      <section aria-labelledby="count-title" className="space-y-5">
        <h2 id="count-title" className="font-display text-3xl font-semibold tracking-tight">
          Exactly what we count
        </h2>
        <p className="max-w-3xl text-muted">
          To learn whether people find web preferences useful, we count a short list of anonymous
          events. Each is a closed choice (never free text, never a URL, never an identifier), and
          events aren&rsquo;t linked to each other or to you. Anything not on this list can&rsquo;t
          be recorded: the code rejects it. We never publish a number smaller than {MINIMUM_COHORT}.
        </p>
        <div className="card overflow-x-auto p-2 sm:p-4">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Event
                </th>
                <th scope="col" className="px-3 py-2">
                  What it tells us
                </th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(ANONYMOUS_EVENTS) as AnonymousEventName[]).map((name) => (
                <tr key={name} className="border-t border-line">
                  <td className="px-3 py-2 font-mono text-xs">{name}</td>
                  <td className="px-3 py-2">{EVENT_DESCRIPTIONS[name]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="local-title" className="space-y-5">
        <h2 id="local-title" className="font-display text-3xl font-semibold tracking-tight">
          What&rsquo;s on your device
        </h2>
        <LocalData />
      </section>

      <section className="card p-7">
        <h2 className="font-display text-2xl font-semibold">On accessibility</h2>
        <p className="mt-2 text-muted">
          SeeItMyWay helps websites respect visitor preferences and deliver supported experience
          variants. It is not accessibility remediation and never claims to make a website
          accessible or compliant. And we never treat a preference as a clue about who you are:
          wanting less motion says nothing about your health, and wanting more room says nothing
          about your age.
        </p>
      </section>
    </div>
  );
}
