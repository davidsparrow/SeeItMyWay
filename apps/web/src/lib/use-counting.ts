'use client';

import { useSyncExternalStore } from 'react';
import { gpcEnabled, TELEMETRY_MODE } from './telemetry';

const subscribe = () => () => {};

/** True when the browser sends Global Privacy Control. False during server rendering. */
export function useGpc(): boolean {
  return useSyncExternalStore(subscribe, gpcEnabled, () => false);
}

/**
 * What happens to anonymous events on this visit, so copy can say exactly that:
 * - `remote`: anonymous counts are sent to the events Worker
 * - `local-only`: no events backend is configured; nothing leaves the device
 * - `gpc`: the browser sends Global Privacy Control; nothing leaves the device
 */
export type CountingStatus = 'remote' | 'local-only' | 'gpc';

export function useCounting(): CountingStatus {
  return useGpc() ? 'gpc' : TELEMETRY_MODE;
}
