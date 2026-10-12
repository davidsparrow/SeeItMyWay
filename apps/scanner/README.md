# `@simw/scanner`: the Site Listener Test (V0C)

"Does your website listen?" (PRD Addendum B.1). A Cloudflare Worker that loads **one public page** five
ways with [Browser Run](https://developers.cloudflare.com/browser-run/) (`@cloudflare/playwright`), then
scores how well it respects visitor preferences. The logic (URL guards, in-page collector, driver,
rubric) is in the framework-free [`packages/scanner-core`](../../packages/scanner-core); the rubric is
documented in [`docs/scanner-rubric.md`](../../docs/scanner-rubric.md).

Status: **deploy-ready, not deployed.** No Cloudflare credentials were available to the build session.
Tested locally:

- the HTTP layer, guards, storage, retention and rate limits in the Workers Vitest pool, with a fake
  browser
- the driver and rubric in real Chromium against the calibration pages
  (`tests/e2e/specs/scanner.spec.ts`)
- the Worker bundle's collector, run in Chromium

A live scan through Browser Run needs a deployment: the build sandbox couldn't reach public sites.

## API

| Route                                | What it does                                                                                                                                                                                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/scans`                     | Body `{ "url": "…" }`. Validation errors answer `400 { error, message }`, rate limits `429`. Otherwise an NDJSON stream: `{"type":"accepted",…}`, one `{"type":"progress","variant",…}` per load, then `{"type":"report","report":ScanReport,"reused":bool}` or `{"type":"error",…}`. |
| `GET /v1/reports/:id`                | A stored report (`ScanReport` from `@simw/scanner-core`), for the shareable `/listen/report/[id]` page. `404` once expired.                                                                                                                                                              |
| `GET /v1/reports/:id/views/:variant` | A JPEG of one emulated load, while it lasts.                                                                                                                                                                                                                                             |

A scan of the same URL within 10 minutes is answered from storage, without a browser.

## Abuse and SSRF guards

- **http(s) on default ports only.** No credentials in the URL, no IP literals (including
  `2130706433`-style forms, which URL parsing normalizes), no `localhost`, single-label or internal
  names (`.local`, `.internal`, `.lan`, `.home.arpa`, …).
- **DNS check:** the hostname is resolved over DNS-over-HTTPS first, and refused if any A/AAAA record is
  private, loopback, link-local (including `169.254.169.254`), CGNAT, documentation, multicast or
  reserved, in IPv4 or IPv6 (including mapped and NAT64 forms).
- **Every request the page makes** goes through the same host checks, inside the browser context.
  Redirects to a refused address abort the scan. (The browser does its own DNS for subresources, so
  this check is by hostname; see `docs/tech-debt.md`.)
- **One page, no crawling.** 20 s to DOMContentLoaded, 8 s more for `load`, a 55 s ceiling per scan,
  at most 250 requests and 15 MB (by Content-Length) per load.
- **No cookies or credentials:** a fresh context per load, service workers blocked, downloads refused.
- **Honest user agent:** Chrome's own string plus
  `SeeItMyWaySiteListener/0.1 (+<PUBLIC_SITE_URL>/listen)`.
- **Rate limits** (Workers Rate Limiting, ephemeral): 3 scans a minute per requester address, 2 per
  target site, 3 overall. The global limit matches Browser Run's free plan (one new browser every
  20 s); raise it on a paid plan.
- **Query strings and fragments are stripped** before loading, and the UI says so.

## Storage and retention

D1 (`migrations/0001_scan_reports.sql`): the report JSON, the normalized URL, and timestamps. Nothing
about the requester. Reports are kept 30 days (`REPORT_TTL_DAYS`). The five screenshots are kept 24 hours
(`VIEWS_TTL_HOURS`). A daily cron (`23 4 * * *`) deletes expired rows, and expired rows are never
served in the meantime. Workers Logs, traces, Logpush and wrangler metrics are off.

## Develop and test

```bash
pnpm --filter @simw/scanner-core test   # guards and rubric (Node)
pnpm --filter @simw/scanner test        # the Worker, with a fake browser (Workers Vitest pool)
pnpm test:e2e                           # includes the calibration specs in real Chromium
pnpm --filter @simw/scanner exec wrangler d1 migrations apply simw-scanner --local
pnpm --filter @simw/scanner dev         # wrangler dev --local on :8787 (local Chromium for Browser Run)
```

## Deploy

Needs `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit, D1: Edit, Browser Rendering: Edit) and
`CLOUDFLARE_ACCOUNT_ID`. From `apps/scanner`:

```bash
# 1. Create the database and copy the printed database_id into wrangler.jsonc (d1_databases[0]).
pnpm exec wrangler d1 create simw-scanner

# 2. Create the tables.
pnpm exec wrangler d1 migrations apply simw-scanner --remote

# 3. Deploy, with the web app's origins and public URL.
pnpm exec wrangler deploy \
  --var "ALLOWED_ORIGINS:https://see-it-my-way-navy.vercel.app,https://see-it-my-way-*-<team>.vercel.app" \
  --var "PUBLIC_SITE_URL:https://see-it-my-way-navy.vercel.app"
```

Then set `NEXT_PUBLIC_SCANNER_URL` in Vercel (Production and Preview) to the printed
`https://simw-scanner.<account>.workers.dev` and redeploy the web app. The rate limiters' `namespace_id`s
(`1711`–`1713`) must be unique in the account.
