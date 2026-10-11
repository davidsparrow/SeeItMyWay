'use client';

import { experienceToAttributes } from '@simw/adapters';
import type { SeeItMyWay, SeeItMyWayState } from '@simw/sdk';
import { NATIVE_SIGNAL_IDS, type NativeSignal } from '@simw/types';
import { Disclosure } from '@simw/ui';
import { track } from '@/lib/telemetry';

function how(signal: NativeSignal): string {
  switch (signal.source.kind) {
    case 'media':
      return `@media (${signal.source.feature})`;
    case 'navigator':
      return `navigator.${signal.source.property}`;
    case 'probe':
      return signal.source.detail;
  }
}

export function RawSignals({ state, sdk }: { state: SeeItMyWayState; sdk: SeeItMyWay }) {
  if (!state.signals) return null;
  const signals = state.signals;
  return (
    <Disclosure
      summary="For nerds → Show raw signals"
      onOpen={() => track('raw_signals_opened', {}, { oncePerPage: true })}
    >
      <div className="space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption className="sr-only">
              Every signal this browser exposes, read locally just now
            </caption>
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3">
                  Signal
                </th>
                <th scope="col" className="py-2 pr-3">
                  Read via
                </th>
                <th scope="col" className="py-2 pr-3">
                  Value
                </th>
                <th scope="col" className="py-2">
                  Kind
                </th>
              </tr>
            </thead>
            <tbody className="font-mono text-[0.8rem]">
              {NATIVE_SIGNAL_IDS.map((id) => {
                const s = signals[id];
                return (
                  <tr key={id} className="border-t border-line">
                    <td className="py-1.5 pr-3 font-semibold">{id}</td>
                    <td className="py-1.5 pr-3 text-muted">{how(s)}</td>
                    <td className="py-1.5 pr-3">
                      {s.supported ? (
                        <>
                          {String(s.value)}
                          {typeof s.raw === 'number' ? ` (${s.raw}px)` : ''}
                        </>
                      ) : (
                        <span className="text-muted">unsupported</span>
                      )}
                    </td>
                    <td className="py-1.5 text-muted">{s.nature}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div>
          <p className="text-sm font-semibold">What this page is applying to itself right now</p>
          <p className="text-xs text-muted">
            This site runs the SeeItMyWay SDK: these attributes on &lt;html&gt; drive every style
            you see.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-surface-2 p-3 text-xs">
            {Object.entries(experienceToAttributes(state.experience))
              .map(([k, v]) => `${k}="${v}"`)
              .join('\n')}
          </pre>
        </div>
        <div>
          <p className="text-sm font-semibold">
            What a participating website would receive from your Passport
          </p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-surface-2 p-3 text-xs">
            {JSON.stringify(sdk.sharedPacket(), null, 2)}
          </pre>
          <p className="mt-1 text-xs text-muted">
            Coarse values only. No identifiers, no history, no list of sites you&rsquo;ve visited.
          </p>
        </div>
      </div>
    </Disclosure>
  );
}
