'use client';

import type { AnonymousEvent } from '@simw/privacy';
import { useEffect, useState } from 'react';
import { clearLocalLog, readLocalLog, TELEMETRY_MODE } from '@/lib/telemetry';

function simwKeys(): string[] {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith('simw:'))
      .sort();
  } catch {
    return [];
  }
}

/** Shows exactly what SeeItMyWay keeps in this browser, and lets the visitor erase it. */
export function LocalData() {
  const [keys, setKeys] = useState<string[]>([]);
  const [log, setLog] = useState<AnonymousEvent[]>([]);

  const refresh = () => {
    setKeys(simwKeys());
    setLog(readLocalLog());
  };
  useEffect(refresh, []);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="card p-6">
        <h3 className="font-semibold">Stored on this device</h3>
        <p className="mt-1 text-sm text-muted">
          Your Passport, per-site Tune settings, anonymous variation seeds and your last Checkup
          result. None of it is sent anywhere.
        </p>
        <ul className="mt-3 space-y-1 font-mono text-xs">
          {keys.length ? (
            keys.map((k) => <li key={k}>{k}</li>)
          ) : (
            <li className="text-muted">Nothing yet.</li>
          )}
        </ul>
        <button
          type="button"
          className="btn btn-secondary mt-4"
          disabled={keys.length === 0}
          onClick={() => {
            for (const k of simwKeys()) localStorage.removeItem(k);
            refresh();
            window.location.reload();
          }}
        >
          Erase everything SeeItMyWay stored
        </button>
      </div>
      <div className="card p-6">
        <h3 className="font-semibold">Anonymous events from this browser</h3>
        <p className="mt-1 text-sm text-muted">
          {TELEMETRY_MODE === 'local-only'
            ? 'This is a preview build: counting is switched off, so events are kept here for you to inspect and never leave your device.'
            : 'These are the exact events sent as anonymous counts.'}
        </p>
        <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-surface-2 p-3 font-mono text-xs">
          {log.length
            ? log.map((e) => `${e.name} ${JSON.stringify(e.props)}`).join('\n')
            : 'No events yet.'}
        </pre>
        <button
          type="button"
          className="btn btn-ghost mt-3"
          disabled={log.length === 0}
          onClick={() => {
            clearLocalLog();
            refresh();
          }}
        >
          Clear event log
        </button>
      </div>
    </div>
  );
}
