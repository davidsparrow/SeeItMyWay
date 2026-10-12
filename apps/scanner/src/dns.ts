/**
 * Resolves a hostname over DNS-over-HTTPS so the scanner can refuse names
 * that point at private, loopback or link-local addresses before any browser
 * is involved. (The browser does its own lookups for the page's resources;
 * those are checked by hostname in the request guard.)
 */
const DOH = 'https://cloudflare-dns.com/dns-query';

interface DohAnswer {
  type: number;
  data: string;
}

export async function resolveHost(
  hostname: string,
  fetcher: typeof fetch = fetch,
): Promise<string[]> {
  const lookups = await Promise.all(
    (['A', 'AAAA'] as const).map(async (type) => {
      const url = `${DOH}?name=${encodeURIComponent(hostname)}&type=${type}`;
      const response = await fetcher(url, { headers: { Accept: 'application/dns-json' } });
      if (!response.ok) return [];
      const body = (await response.json()) as { Status?: number; Answer?: DohAnswer[] };
      if (body.Status !== 0) return [];
      // 1 = A, 28 = AAAA. CNAME records (5) in the chain are skipped; their targets resolve here too.
      return (body.Answer ?? []).filter((a) => a.type === 1 || a.type === 28).map((a) => a.data);
    }),
  );
  return lookups.flat();
}
