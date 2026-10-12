/**
 * Anonymous experience seed (PRD §19).
 *
 * A random value generated and stored by one website, on one browser. It
 * carries no information about the visitor; it only means "use variation #N
 * for this browser" so harmless aesthetic variety stays consistent between
 * visits.
 */

const SEED_BYTES = 8;

export function createSeed(): string {
  const bytes = new Uint8Array(SEED_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function isSeed(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{16}$/.test(value);
}

/** FNV-1a: tiny, deterministic and identical in every runtime. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function seedToVariant(seed: string, variants: number): number {
  if (variants <= 0) throw new RangeError('variants must be positive');
  return fnv1a(seed) % variants;
}
