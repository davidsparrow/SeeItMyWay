import type { KeyValueStore } from '@simw/types';

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const map = new Map(Object.entries(initial));
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => void map.set(key, value),
    remove: (key) => void map.delete(key),
  };
}

/**
 * localStorage that never throws: private windows, blocked storage and
 * quota errors fall back to memory for this page view.
 */
export function safeLocalStorage(): KeyValueStore {
  const fallback = memoryStore();
  const ls = (): Storage | null => {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  };
  return {
    get(key) {
      try {
        return ls()?.getItem(key) ?? fallback.get(key);
      } catch {
        return fallback.get(key);
      }
    },
    set(key, value) {
      try {
        const storage = ls();
        if (storage) storage.setItem(key, value);
        else fallback.set(key, value);
      } catch {
        fallback.set(key, value);
      }
    },
    remove(key) {
      try {
        ls()?.removeItem(key);
      } catch {
        // ignore
      }
      fallback.remove(key);
    },
  };
}

export const PASSPORT_KEY = 'simw:passport';

export function siteKeys(site: string) {
  const prefix = `simw:site:${site}`;
  return {
    overrides: `${prefix}:overrides`,
    seed: `${prefix}:seed`,
    /** Last applied attributes, read by the boot script to avoid a flash. */
    applied: `${prefix}:applied`,
  };
}
