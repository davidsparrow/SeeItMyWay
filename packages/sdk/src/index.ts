// Re-exported so a site needs only one import.
export * from '@simw/adapters';
export {
  detectNativeSignals,
  detectPlatform,
  type SignalChange,
  watchNativeSignals,
} from '@simw/detector';
export * from '@simw/protocol';
export type * from '@simw/types';
export { type BootSnapshot, bootScript } from './boot';
export {
  createLocalPassport,
  PASSPORT_CHANGE_EVENT,
  type PassportSource,
  readPreferences,
  type WritablePassport,
  writePreferences,
} from './passport';
export {
  createSeeItMyWay,
  type SeeItMyWay,
  type SeeItMyWayOptions,
  type SeeItMyWayState,
} from './runtime';
export { memoryStore, PASSPORT_KEY, safeLocalStorage, siteKeys } from './storage';
