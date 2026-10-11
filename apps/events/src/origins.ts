/**
 * Origin allowlist with one wildcard form: `*` stands for a single DNS label
 * (letters, digits and hyphens, no dots), so a Vercel preview pattern like
 * `https://seeitmyway-*-team.vercel.app` can't be stretched to another domain.
 */
export type OriginMatcher = (origin: string | null) => boolean;

const escapeRegExp = (text: string) => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

export function originMatcher(allowed: string | undefined): OriginMatcher {
  const patterns = (allowed ?? '')
    .split(',')
    .map((entry) => entry.trim().replace(/\/+$/, '').toLowerCase())
    .filter(Boolean)
    .map((entry) => new RegExp(`^${escapeRegExp(entry).replace(/\*/g, '[a-z0-9-]+')}$`));
  return (origin) => {
    if (!origin) return false;
    const normalized = origin.toLowerCase();
    return patterns.some((pattern) => pattern.test(normalized));
  };
}
