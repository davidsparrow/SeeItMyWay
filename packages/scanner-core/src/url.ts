/**
 * Abuse and SSRF guards for the Site Listener Test.
 *
 * The scanner loads exactly one public page. Anything that could point it at
 * a private network, a metadata service or a non-web port is refused before
 * a browser is involved, and the same host checks run on every request the
 * page makes.
 */

export const MAX_URL_LENGTH = 2048;

export type UrlRejection =
  | 'invalid'
  | 'too-long'
  | 'scheme'
  | 'credentials'
  | 'port'
  | 'ip-literal'
  | 'internal-host';

export type NormalizedUrl =
  | {
      ok: true;
      /** Origin and path only. */
      url: string;
      hostname: string;
      /** What was removed, so the UI can say so. */
      stripped: { query: boolean; fragment: boolean };
    }
  | { ok: false; reason: UrlRejection };

export const URL_REJECTION_MESSAGES: Record<
  UrlRejection | 'private-address' | 'unresolvable',
  string
> = {
  invalid: 'That doesn’t look like a web address.',
  'too-long': 'That address is too long.',
  scheme: 'Only http:// and https:// addresses can be tested.',
  credentials: 'Addresses with a username or password can’t be tested.',
  port: 'Only addresses on the standard web ports can be tested.',
  'ip-literal': 'Please use the site’s name, not an IP address.',
  'internal-host':
    'That looks like a private or internal address. Only public websites can be tested.',
  'private-address':
    'That name points to a private network address. Only public websites can be tested.',
  unresolvable: 'We couldn’t find that site. Check the address and try again.',
};

/** Suffixes that never name a public website. */
const INTERNAL_SUFFIXES = [
  'localhost',
  'local',
  'localdomain',
  'internal',
  'intranet',
  'lan',
  'home',
  'corp',
  'private',
  'test',
  'example',
  'invalid',
  'onion',
  'arpa',
];

const IPV4_LITERAL = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/** Host checks shared by the submitted URL and every request the page makes. */
export function hostRejection(hostname: string): UrlRejection | null {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (!host) return 'invalid';
  // WHATWG URL parsing already turns 2130706433, 0x7f.1 and friends into dotted IPv4.
  if (IPV4_LITERAL.test(host) || host.startsWith('[') || host.includes(':')) return 'ip-literal';
  if (!host.includes('.')) return 'internal-host';
  const labels = host.split('.');
  const tld = labels[labels.length - 1] ?? '';
  if (INTERNAL_SUFFIXES.includes(tld) || host.endsWith('.home.arpa')) return 'internal-host';
  return null;
}

/** Checks for any URL the scanning browser is about to request. */
export function requestRejection(raw: string): UrlRejection | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'invalid';
  }
  if (url.protocol === 'data:' || url.protocol === 'blob:') return null;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'scheme';
  if (url.username || url.password) return 'credentials';
  if (url.port !== '') return 'port';
  return hostRejection(url.hostname);
}

export function normalizeScanUrl(input: string): NormalizedUrl {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: 'invalid' };
  if (trimmed.length > MAX_URL_LENGTH) return { ok: false, reason: 'too-long' };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  const rejection = requestRejection(url.href);
  if (rejection) return { ok: false, reason: rejection };
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  return {
    ok: true,
    url: `${url.protocol}//${hostname}${url.pathname}`,
    hostname,
    stripped: { query: url.search !== '', fragment: url.hash !== '' },
  };
}

function ipv4Parts(ip: string): number[] | null {
  if (!IPV4_LITERAL.test(ip)) return null;
  const parts = ip.split('.').map(Number);
  return parts.every((p) => p >= 0 && p <= 255) ? parts : null;
}

function privateIpv4([a = 0, b = 0, c = 0]: number[]): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

/** Expands an IPv6 address to eight 16-bit groups, or null if it isn't one. */
function ipv6Groups(ip: string): number[] | null {
  let text = ip.toLowerCase().replace(/^\[|\]$/g, '');
  const zone = text.indexOf('%');
  if (zone >= 0) text = text.slice(0, zone);
  // An embedded IPv4 tail (::ffff:10.0.0.1) becomes two groups.
  const v4 = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text);
  if (v4?.[1]) {
    const parts = ipv4Parts(v4[1]);
    if (!parts) return null;
    const [a = 0, b = 0, c = 0, d = 0] = parts;
    text = `${text.slice(0, -v4[1].length)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (groups.length !== 8) return null;
  const values = groups.map((g) =>
    /^[0-9a-f]{1,4}$/.test(g) ? Number.parseInt(g, 16) : Number.NaN,
  );
  return values.some(Number.isNaN) ? null : values;
}

/**
 * True for any address a public website shouldn't resolve to: loopback,
 * private, link-local (including the 169.254.169.254 metadata service),
 * carrier-grade NAT, documentation, multicast and reserved ranges, in IPv4
 * and IPv6 (including IPv4-mapped and NAT64 forms). Unparseable input counts
 * as private: fail closed.
 */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ipv4Parts(ip);
  if (v4) return privateIpv4(v4);
  const g = ipv6Groups(ip);
  if (!g) return true;
  const [g0 = 0, g1 = 0, g2 = 0, g3 = 0, g4 = 0, g5 = 0, g6 = 0, g7 = 0] = g;
  const embeddedV4 = [g6 >> 8, g6 & 0xff, g7 >> 8, g7 & 0xff];
  if (g.every((v) => v === 0)) return true; // ::
  if (
    g0 === 0 &&
    g1 === 0 &&
    g2 === 0 &&
    g3 === 0 &&
    g4 === 0 &&
    g5 === 0 &&
    g6 === 0 &&
    g7 === 1
  ) {
    return true; // ::1
  }
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
    return privateIpv4(embeddedV4); // ::ffff:a.b.c.d
  }
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return privateIpv4(embeddedV4); // 64:ff9b::a.b.c.d (NAT64)
  }
  if ((g0 & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g0 & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g0 & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (g0 === 0x2001 && g1 === 0x0db8) return true; // 2001:db8::/32 documentation
  if (g0 === 0x0100 && g1 === 0 && g2 === 0 && g3 === 0) return true; // 100::/64 discard
  if (g0 === 0) return true; // the rest of ::/16 is reserved
  return false;
}
