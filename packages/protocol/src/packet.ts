import {
  PREFERENCE_KEYS,
  VOCABULARY,
  isPreferenceKey,
  isPreferenceValue,
  type PartialPreferences,
  type PreferenceKey,
} from './vocabulary';

export const PROTOCOL_VERSION = '0.1';

/**
 * The standardized preference packet a website may receive (PRD §17).
 *
 * Only coarse vocabulary values. Never browsing history, identifiers, scores,
 * visited-site lists or inferences.
 */
export type PreferencePacket = { version: typeof PROTOCOL_VERSION } & PartialPreferences;

export type PacketParseResult =
  { ok: true; packet: PreferencePacket; dropped: string[] } | { ok: false; error: string };

export function createPacket(prefs: PartialPreferences): PreferencePacket {
  const packet: PreferencePacket = { version: PROTOCOL_VERSION };
  for (const key of PREFERENCE_KEYS) {
    const value = prefs[key];
    if (value !== undefined && isPreferenceValue(key, value)) {
      (packet as Record<string, string>)[key] = value;
    }
  }
  return packet;
}

/**
 * Validates untrusted input. Unknown keys and out-of-vocabulary values are
 * dropped, never passed through, so a packet can only ever carry the coarse
 * buckets the protocol defines.
 */
export function parsePacket(input: unknown): PacketParseResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: 'Packet must be an object.' };
  }
  const record = input as Record<string, unknown>;
  if (record.version !== PROTOCOL_VERSION) {
    return { ok: false, error: `Unsupported protocol version: ${String(record.version)}` };
  }
  const prefs: PartialPreferences = {};
  const dropped: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (key === 'version') continue;
    if (isPreferenceKey(key) && isPreferenceValue(key, value)) {
      (prefs as Record<PreferenceKey, unknown>)[key] = value;
    } else {
      dropped.push(key);
    }
  }
  return { ok: true, packet: createPacket(prefs), dropped };
}

/** JSON Schema (2020-12) for the packet, generated from the vocabulary. */
export function preferencePacketSchema(): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    version: { const: PROTOCOL_VERSION },
  };
  for (const key of PREFERENCE_KEYS) {
    const def = VOCABULARY[key];
    properties[key] = {
      title: def.label,
      description: def.description,
      enum: [...def.values],
      default: def.default,
      'x-simw-sharing': def.sharing,
    };
  }
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `urn:simw:protocol:${PROTOCOL_VERSION}:preference-packet`,
    title: 'SeeItMyWay Preference Packet',
    type: 'object',
    required: ['version'],
    additionalProperties: false,
    properties,
  };
}
