import { createPacket, parsePacket, type PartialPreferences } from '@simw/protocol';
import type { KeyValueStore, Unsubscribe } from '@simw/types';
import { PASSPORT_KEY, safeLocalStorage } from './storage';

/**
 * Where Passport preferences come from.
 *
 * V0: a profile saved locally on the SeeItMyWay site itself.
 * V1.5: the Passport browser extension, through a preference bridge that
 * only ever returns a standardized packet (PRD §17). Websites never get to
 * read arbitrary extension storage.
 */
export interface PassportSource {
  read(): PartialPreferences;
  subscribe?(listener: () => void): Unsubscribe;
}

export interface WritablePassport extends PassportSource {
  write(prefs: PartialPreferences): void;
  clear(): void;
}

export function readPreferences(store: KeyValueStore, key: string): PartialPreferences {
  const raw = store.get(key);
  if (!raw) return {};
  try {
    const result = parsePacket(JSON.parse(raw));
    if (!result.ok) return {};
    const { version: _version, ...prefs } = result.packet;
    return prefs;
  } catch {
    return {};
  }
}

export function writePreferences(
  store: KeyValueStore,
  key: string,
  prefs: PartialPreferences,
): void {
  store.set(key, JSON.stringify(createPacket(prefs)));
}

/** Fired on `window` when a local Passport is written in this tab (other tabs get `storage`). */
export const PASSPORT_CHANGE_EVENT = 'simw:passport-change';

export function createLocalPassport(
  store: KeyValueStore = safeLocalStorage(),
  key: string = PASSPORT_KEY,
): WritablePassport {
  const announce = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PASSPORT_CHANGE_EVENT, { detail: { key } }));
    }
  };

  return {
    read: () => readPreferences(store, key),
    write(prefs) {
      writePreferences(store, key, prefs);
      announce();
    },
    clear() {
      store.remove(key);
      announce();
    },
    subscribe(listener) {
      if (typeof window === 'undefined') return () => {};
      const onStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) listener();
      };
      const onLocal = (event: Event) => {
        if ((event as CustomEvent<{ key: string }>).detail?.key === key) listener();
      };
      window.addEventListener('storage', onStorage);
      window.addEventListener(PASSPORT_CHANGE_EVENT, onLocal);
      return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener(PASSPORT_CHANGE_EVENT, onLocal);
      };
    },
  };
}
