import {
  createPacket,
  isPreferenceValue,
  type PartialPreferences,
  PREFERENCE_KEYS,
  type PreferenceKey,
  type PreferencePacket,
  VOCABULARY,
} from '@simw/protocol';

export interface SharingOptions {
  /** Ask-first preferences the visitor has explicitly approved for this site. */
  approvedAskFirst?: readonly PreferenceKey[];
}

/**
 * Reduces a profile to what a website may receive (PRD §16–17): universal
 * preferences, plus ask-first preferences only when explicitly approved.
 * Everything is re-validated against the vocabulary on the way out.
 */
export function filterForSharing(
  prefs: PartialPreferences,
  options: SharingOptions = {},
): PreferencePacket {
  const approved = new Set(options.approvedAskFirst ?? []);
  const shareable: PartialPreferences = {};
  for (const key of PREFERENCE_KEYS) {
    const value = prefs[key];
    if (value === undefined || !isPreferenceValue(key, value)) continue;
    const sharing = VOCABULARY[key].sharing as string;
    if (sharing === 'universal' || approved.has(key)) {
      (shareable as Record<PreferenceKey, string>)[key] = value;
    }
  }
  return createPacket(shareable);
}

export interface ResultCardItem<K extends PreferenceKey = PreferenceKey> {
  key: K;
  value: string;
}

/**
 * Items for the shareable "My Web Wants" card (Addendum E).
 *
 * Only preferences the visitor explicitly chose to place on the card, in
 * vocabulary order. Device and browser characteristics can't appear: the
 * card is built from preference keys alone.
 */
export function buildResultCardItems(
  profile: PartialPreferences,
  chosen: readonly PreferenceKey[],
): ResultCardItem[] {
  const picked = new Set(chosen);
  const items: ResultCardItem[] = [];
  for (const key of PREFERENCE_KEYS) {
    if (!picked.has(key)) continue;
    const value = profile[key];
    if (value !== undefined && isPreferenceValue(key, value)) items.push({ key, value });
  }
  return items;
}
