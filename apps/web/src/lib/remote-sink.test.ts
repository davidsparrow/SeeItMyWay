import type { AnonymousEvent } from '@simw/privacy';
import { describe, expect, it, vi } from 'vitest';
import { createRemoteSink, flushOnPageHide, MAX_BATCH } from './remote-sink';

const started: AnonymousEvent = { name: 'checkup_started', props: {} } as AnonymousEvent;

function setup(gpc = false) {
  const transport = vi.fn<(url: string, body: string) => void>();
  const state = { gpc };
  const sink = createRemoteSink({
    baseUrl: 'https://events.example/',
    gpc: () => state.gpc,
    transport,
  });
  return { sink, transport, state };
}

describe('createRemoteSink', () => {
  it('batches events and sends them to /v1/events on flush', () => {
    const { sink, transport } = setup();
    sink.record(started);
    sink.record(started);
    expect(transport).not.toHaveBeenCalled();
    sink.flush();
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledWith(
      'https://events.example/v1/events',
      JSON.stringify({ events: [started, started] }),
    );
    expect(sink.pending()).toBe(0);
    sink.flush();
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('sends a full batch straight away, never more than the Worker accepts', () => {
    const { sink, transport } = setup();
    for (let i = 0; i < MAX_BATCH; i++) sink.record(started);
    expect(transport).toHaveBeenCalledTimes(1);
    const body = JSON.parse(transport.mock.calls[0]?.[1] ?? '{}') as { events: unknown[] };
    expect(body.events).toHaveLength(MAX_BATCH);
  });

  it('sends nothing at all when Global Privacy Control is on', () => {
    const { sink, transport } = setup(true);
    for (let i = 0; i < MAX_BATCH * 2; i++) sink.record(started);
    sink.flush();
    expect(transport).not.toHaveBeenCalled();
    expect(sink.pending()).toBe(0);
  });

  it('checks GPC at send time and stays silent for the rest of the visit', () => {
    const { sink, transport, state } = setup(false);
    sink.record(started);
    state.gpc = true;
    sink.flush();
    state.gpc = false;
    sink.record(started);
    sink.flush();
    expect(transport).not.toHaveBeenCalled();
  });

  it('flushes when the page is hidden or unloaded', () => {
    const { sink, transport } = setup();
    const listeners: Record<string, () => void> = {};
    const target = {
      document: {
        visibilityState: 'visible',
        addEventListener: (type: string, fn: () => void) => {
          listeners[`doc:${type}`] = fn;
        },
        removeEventListener: vi.fn(),
      },
      addEventListener: (type: string, fn: () => void) => {
        listeners[`win:${type}`] = fn;
      },
      removeEventListener: vi.fn(),
    } as unknown as Window;
    flushOnPageHide(sink, target);

    sink.record(started);
    listeners['doc:visibilitychange']?.();
    expect(transport).not.toHaveBeenCalled();
    (target.document as { visibilityState: string }).visibilityState = 'hidden';
    listeners['doc:visibilitychange']?.();
    expect(transport).toHaveBeenCalledTimes(1);

    sink.record(started);
    listeners['win:pagehide']?.();
    expect(transport).toHaveBeenCalledTimes(2);
  });
});
