# `@simw/events`: anonymous research counts

A Cloudflare Worker with a D1 database. It accepts the allowlisted anonymous events from `apps/web`
(`ANONYMOUS_EVENTS` in `packages/privacy/src/events.ts`) and stores **per-day aggregates only**.

Status: **deploy-ready, not deployed.** No Cloudflare credentials were available to the build session.
Everything below is tested locally (Workers Vitest pool + Miniflare, and `wrangler dev --local` with a
local D1).

## API

| Route              | What it does                                                                                                                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/events`  | Body `{ "events": AnonymousEvent[] }`, at most 20 events and 8 KB. Each event goes through `sanitizeEvent`; invalid ones are dropped silently. Answers `204` with no body (`400` malformed, `413` too large, `403` origin not allowed, `429` rate-limited). The input is never echoed. |
| `GET /v1/summary`  | All-time totals per (event, props) through `suppressSmallCohorts` (minimum 50). Suppressed cells are omitted (only their number is reported) and there are no subtotals, so small groups can't be recovered by subtraction. For a future "State of Web Preference Awareness" report.    |
| `OPTIONS` on both  | CORS preflight for origins in `ALLOWED_ORIGINS` (`POST, OPTIONS` on events, `GET, OPTIONS` on summary).                                                                                                                                                                               |

The web app sends batches with `navigator.sendBeacon` (falling back to `fetch` with `keepalive`) as
`text/plain`, so requests are CORS-simple and need no preflight.

## Privacy properties

- **Stored:** one row per `(UTC day, event name, canonical props JSON)` with a count
  (`migrations/0001_event_counts.sql`). Nothing else: no individual events, IP addresses, user agents,
  referrers, countries, cookies or request IDs.
- **Global Privacy Control:** a request with `Sec-GPC: 1` is discarded unread and answered `204`, like
  any accepted request, so the response doesn't reveal the check. (The web client already sends nothing
  under GPC; this is defense in depth.)
- **Rate limiting:** the Workers Rate Limiting binding (`RATE_LIMITER`, 30 requests per minute per
  address). Cloudflare keeps those counters in memory for the window only; the address is never written
  to D1 or logged. `/privacy` says so.
- **Logging:** the Worker never logs. `wrangler.jsonc` turns off Workers Logs, invocation logs, traces
  and Logpush, and wrangler's own usage metrics. `wrangler tail`, if someone runs it, streams request
  metadata live but stores nothing. Cloudflare still processes request metadata at its edge to deliver
  and protect traffic (and shows aggregate request counts in the dashboard), under its own privacy
  policy.

## Develop and test

```bash
pnpm --filter @simw/events test          # Workers Vitest pool: ingestion, GPC, CORS, rate limit, summary
pnpm --filter @simw/events exec wrangler d1 migrations apply simw-events --local
pnpm --filter @simw/events dev           # wrangler dev --local on :8787, with a local D1
curl -i -X POST http://127.0.0.1:8787/v1/events -H 'Origin: http://localhost:3000' \
  --data '{"events":[{"name":"checkup_started","props":{}}]}'
```

Then run the web app with `NEXT_PUBLIC_EVENTS_URL=http://127.0.0.1:8787 pnpm dev`.

This package pins Vitest 4 (`@cloudflare/vitest-pool-workers` 0.22 doesn't support Vitest 5 yet) and
wrangler `4.124.0`, the version that pool bundles, so the tree holds one wrangler and one `workerd`.

## Deploy

Needs `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit, D1: Edit) and `CLOUDFLARE_ACCOUNT_ID` in the
environment. From `apps/events`:

```bash
# 1. Create the database, then copy the printed database_id into wrangler.jsonc (d1_databases[0]).
pnpm exec wrangler d1 create simw-events

# 2. Create the table.
pnpm exec wrangler d1 migrations apply simw-events --remote

# 3. Deploy with the production and preview origins of apps/web (`*` = one DNS label).
pnpm exec wrangler deploy \
  --var "ALLOWED_ORIGINS:https://see-it-my-way-navy.vercel.app,https://see-it-my-way-*-<team>.vercel.app"
```

`wrangler deploy` prints the URL, e.g. `https://simw-events.<account>.workers.dev`. Then:

4. In Vercel, set `NEXT_PUBLIC_EVENTS_URL` to that URL for Production and Preview, and redeploy
   (it's inlined at build time).
5. Check: `curl https://simw-events.<account>.workers.dev/v1/summary` returns
   `{"minimumCohort":50,"totals":{},…}`.

The rate limiter's `namespace_id` (`1701`) must be unique among rate limiters in the account; change it
if it clashes.
