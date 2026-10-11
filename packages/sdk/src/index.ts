export {
  createSeeItMyWay,
  type SeeItMyWay,
  type SeeItMyWayOptions,
  type SeeItMyWayState,
} from './runtime';
export { bootScript, type BootSnapshot } from './boot';
export {
  PASSPORT_CHANGE_EVENT,
  createLocalPassport,
  readPreferences,
  writePreferences,
  type PassportSource,
  type WritablePassport,
} from './passport';
export { memoryStore, safeLocalStorage, siteKeys, PASSPORT_KEY } from './storage';

// Re-exported so a site needs only one import.
export * from '@simw/adapters';
export {
  detectNativeSignals,
  detectPlatform,
  watchNativeSignals,
  type SignalChange,
} from '@simw/detector';
export * from '@simw/protocol';
export type * from '@simw/types';
