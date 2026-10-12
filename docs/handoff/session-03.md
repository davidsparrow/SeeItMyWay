# Handoff: go live → scanner follow-through → Tune This Site for any website

You're continuing SeeItMyWay, "the preference layer for the web". V0A (Browser Checkup), V0B (adaptive
demo, Playground, Passport) and V0C (Site Listener Test) are built and merged to `main`
([davidsparrow/SeeItMyWay#1](https://github.com/davidsparrow/SeeItMyWay/pull/1)). **Nothing is deployed
yet.** This document is your brief.

_Revision 1 (2026-10-12), written at the end of session 2. Section 1 is locked: it carries forward the
product owner's session-2 decisions. Section 2 is **proposed**: the product owner confirms, edits or
strikes each item in the prompt that starts your session. Where the prompt says nothing about an item,
use its recommended default._

## 0. Start here

1. Repo: `davidsparrow/SeeItMyWay`. Base your designated branch on `main`. If `main` doesn't have this
   file yet, read it from `origin/claude/seeitmyway-ecosystem-build-gyx160`.
2. Read `CLAUDE.md` (the working agreement), `AGENTS.md`, `README.md`, `docs/tech-debt.md` (TD-1…TD-6),
   `docs/scanner-rubric.md`, and the three deploy runbooks: `docs/deploy/vercel.md`,
   `apps/events/README.md`, `apps/scanner/README.md`. Skim `docs/handoff/session-02.md` for history.
3. Green baseline **before changing anything**:
   `pnpm install && pnpm check && pnpm build && pnpm test:e2e`. Expect:
   - 22 check tasks and 166 unit tests
   - 3 build tasks, with routes `/`, `/demo`, `/listen`, `/listen/report/[id]`, `/passport`,
     `/playground` and `/privacy`
   - 16 Playwright tests: INV-1…INV-3, GPC, scanner calibration and `/listen`
4. Check `main`'s latest CI run is green. If it isn't, fixing it comes first.
5. Commit after each numbered step with all gates green, INV-1…INV-3 included. Gate on exit codes, never
   on `grep` output (session 2 once pushed a red commit that way). Push to your designated branch. Don't
   open a PR unless asked.

## 1. Locked decisions (carried forward from session 2)

1. Keep the TypeScript monorepo. `apps/web` is the canonical Next.js app on Vercel. `apps/events` and
   `apps/scanner` are Cloudflare Workers. `packages/*` stay framework- and deployment-free.
2. TypeScript stays at `~5.9.3` (TD-1). Don't upgrade to TS 7 or add a second compiler.
3. Biome is the only formatter and linter. CI gates, in order: install → `biome ci` → typecheck → unit
   tests → build → browser invariants.
4. Anonymous counts go to the events Worker and D1 as per-day aggregates only, from the closed allowlist
   in `packages/privacy/src/events.ts`. A new event needs closed values, a `/privacy` description and a
   commit message that covers its privacy implications.
5. **GPC means nothing is sent.** Counting copy must be true in all three states (`remote`, `local-only`,
   `gpc`).
6. **Stated preferences ≠ effective behavior** (see CLAUDE.md "Product rules"). Never disable a choice
   because of a device constraint; save it and explain the override.
7. Package scope `@simw/`. Protocol identity `urn:simw:protocol:0.1`, separate from any hostname. All
   URLs come from config/env.
8. Missing credentials never block progress: finish, test locally, document, move on.
9. The Passport extension stays out of scope.
10. Never claim accessibility compliance (PRD §26).

## 2. Proposed for session 3 (product owner: confirm, edit or strike)

| #   | Proposal | Recommended default |
| --- | -------- | ------------------- |
| P1  | **Credentials and network.** Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as environment variables in the cloud environment's settings. Allow `api.vercel.com`, `api.cloudflare.com`, `*.vercel.app`, `*.workers.dev` and `cloudflare-dns.com` in its network policy. | If they're absent, skip step 1 and say so once. |
| P2  | **Names.** Vercel project `seeitmyway` (→ `seeitmyway.vercel.app`). The team slug is needed for the preview-origin pattern in `ALLOWED_ORIGINS`. Workers `simw-events` and `simw-scanner` on `*.workers.dev`. | As listed; read the team slug from the Vercel API. |
| P3  | **Public calibration fixtures.** Serve the `apps/demo-sites` build from the web app at `/fixtures/bramble/` (noindex), like `/sdk/`, so the live scanner can be calibrated against known pages. | Yes. |
| P4  | **TD-4** (scanner subresource DNS). Use Browser Run session guardrails (`allowedDomains`: target host + `*.`target host + the `common-cdns` set) only if calibration scores don't change; otherwise resolve subresource hosts in the route handler. | Measure both against the fixtures; pick the one that keeps calibration stable. |
| P5  | **"With SeeItMyWay" preview** in the scanner report: re-run the reduced-motion and dark loads with the SDK's Level 1 safe adapters injected, and show the projected score ("Install SeeItMyWay and this becomes N"). This was in the original scanner plan. | Yes, as an extra report section; the score itself stays rubric v1. |
| P6  | **TD-6:** server-render `/listen/report/[id]` with a short revalidate and an Open Graph image showing the score. | Yes. |
| P7  | **Tune This Site for any website** (PRD §18, §31): a framework-free widget in the SDK, opted into with `data-simw-tune` on the script tag, with a size budget. | Yes, in the script-tag build behind the attribute: ≤ 6 KB gzipped extra, ≤ 16 KB gzipped total (today's IIFE is ~10 KB gzipped). |
| P8  | **Accept TD-2…TD-6** as logged in `docs/tech-debt.md`. | Accept. |
| P9  | **Plan:** Workers Free vs Paid. On Free, Browser Run allows 10 browser-minutes a day and a new browser every 20 s, which matches today's rate limits. | Free until there's traffic; raise `SCAN_GLOBAL_LIMITER` on Paid. |

### Sequence

1. Go live (§3), if P1 is in place
2. Scanner follow-through (§4)
3. Tune This Site for any website (§5)
4. Housekeeping (§6)

## 3. Step 1: go live

Follow the runbooks exactly; don't rewrite them unless something in them is wrong (then fix the doc in
the same commit).

1. **Events Worker:** `wrangler d1 create simw-events`, put the id in `wrangler.jsonc`, apply migrations
   with `--remote`, then `wrangler deploy` with `ALLOWED_ORIGINS`. Check:
   - `curl …/v1/summary` returns `{"minimumCohort":50,"totals":{}…}`
   - a `POST` with `Sec-GPC: 1` returns 204 and stores nothing (`wrangler d1 execute --remote`)
2. **Scanner Worker:** the same, plus `PUBLIC_SITE_URL`. Run one live scan of a public page you're allowed
   to load, and keep the NDJSON output for the commit message.
3. **Web app:** create or link the Vercel project per `docs/deploy/vercel.md`, set
   `NEXT_PUBLIC_EVENTS_URL` and `NEXT_PUBLIC_SCANNER_URL`, then deploy production.
4. **Smoke test:** `pnpm build && BASE_URL=https://<project>.vercel.app pnpm test:e2e`. The local-only
   specs skip themselves.
5. **Live calibration (TD-5):** with P3, scan `/fixtures/bramble/plain.html`, `/fixtures/bramble/index.html`
   and `/demo` on the deployed site through the live scanner. Compare with the local calibration in
   `docs/scanner-rubric.md`: 32 / ≥ 90 / ≥ 80. If live results differ, find out why (Browser Run Chrome
   version, timing, blocked requests) before changing any threshold. A threshold change means a new
   `RUBRIC_VERSION`.
6. Record the live URLs in `README.md` ("Status") and in the runbooks. Update `/privacy` only if behavior
   changed.

## 4. Step 2: scanner follow-through

- **P4 (TD-4):** implement the chosen guard, with Worker tests, and re-run calibration.
- **P5 ("With SeeItMyWay"):** the driver gains an option to inject the SDK's IIFE (served at
  `/sdk/simw.global.js`) with `data-simw-auto` before page scripts. Analyze those loads with the same
  rubric and show "today N / with SeeItMyWay M" plus which rows flip. Be honest: only Level 1 safe
  adaptations (motion, autoplay, touch targets) can change anything. Theme and contrast need the site's own
  CSS, so say that rather than projecting them.
- **P6 (TD-6):** server fetch with `revalidate`; `generateMetadata` with the score; an OG image route.
  Expired reports return 404 with the existing "expired" copy. Keep `robots: noindex`.
- **Optional event:** if you count something new (e.g. "with SeeItMyWay" viewed), follow decision 4.

## 5. Step 3: Tune This Site for any website (P7)

PRD §18 asks for a small, consistent Tune control that any participating site can offer. The Northlight
demo has one in React (`apps/web/src/northlight/tune-panel.tsx`). This step makes a framework-free one
for the SDK.

- **Where:** `packages/sdk/src/tune/` (vanilla TS DOM, no React), exported for npm and auto-mounted in
  the IIFE when the script tag has `data-simw-tune` (optionally `data-simw-tune-position`).
- **What:** motion, theme, density, text size, visual richness and autoplay, driven by `VOCABULARY`.
  Every value can be chosen; constraint notes come from the resolver's `constraints`. Move the copy helper
  in `apps/web/src/content/constraints.ts` into a framework-free package so the web app and the widget
  share it. Include a "why does it look like this?" summary and a reset.
- **Accessibility of the widget itself:**
  - a real `<button>` toggle with `aria-expanded`
  - a labelled dialog or disclosure
  - radio groups
  - visible focus
  - respects `data-simw-motion`
  - works with forced colors
  - Shadow DOM, so site CSS can't break it (and it can't break the site)
- **Fail closed:** an error unmounts the widget and leaves the site untouched.
- **Size:** the IIFE is ~10 KB gzipped today (28 KB minified). Measure before and after and enforce the
  P7 budget in CI with a small script that fails over budget.
- **Tests:**
  - unit tests in `packages/sdk`
  - a new fixture `apps/demo-sites/tune.html`
  - a new invariant **INV-4**: "A visitor can open Tune on a plain-HTML site, choose Full motion on a
    reduced-motion device, and see it saved, explained, and still calm." Name the test with the ID.
- **Docs:** update the `/listen` "Any website" snippet to show `data-simw-tune`, and add the attribute to
  the SDK docs and `README.md`.

## 6. Step 4: housekeeping

- **TD-2:** check whether `@cloudflare/vitest-pool-workers` now supports Vitest 5. If it does, move both
  Workers to the repo's Vitest and a current wrangler, and raise the compatibility date. If not, leave it.
- **TD-3:** extract the origin matcher once a third Worker exists. Otherwise leave it.
- **Docs:** keep `README.md` "What's built" and "Status and known gaps" true, and log any new deferral in
  `docs/tech-debt.md`.

## 7. Out of scope

- The Passport extension (`apps/extension`).
- TypeScript 7 (TD-1).
- Accounts, billing, the owner dashboard, crawling, template clustering and site-change monitoring.
- Vocabulary changes.
- Marking `needs-review` "Show me how" steps verified without a primary source. Vendor help sites were
  unreachable from the build environment.
- Publishing the SDK to npm or a CDN. That needs a decision and credentials not in this brief.

## 8. Environment notes (from sessions 1 and 2)

- **Network:** the proxy blocks `developers.cloudflare.com`, vendor help sites and most public hosts,
  including `example.com` and `cloudflare-dns.com`. `raw.githubusercontent.com` and the npm registry work.
  - Cloudflare docs: `cloudflare/cloudflare-docs` at `src/content/docs/browser-run/…`
  - MDN: `mdn/content` and `mdn/browser-compat-data`
- **Playwright:** Chromium 1194 is at `/opt/pw-browsers` with `PLAYWRIGHT_BROWSERS_PATH` set, and
  `@playwright/test` is pinned at `1.56.1`. Never run `playwright install` in the container. CI installs
  Chromium itself.
- **Browser builds:** the e2e build is `pnpm --filter @simw/web build:e2e`, written to
  `apps/web/.next-e2e`, with test events and scanner URLs baked in. Never point e2e at `.next`: Turborepo
  cache restores mix builds that differ only in `NEXT_PUBLIC_*`.
- **Ports:** e2e web 3100, e2e fixtures 5175, `wrangler dev` 8787.
- **Stopping servers:** stop `next start` by PID, found with `ps -eo pid,comm` (`next-server`). Never
  `pkill -f` with a pattern that's also in your own command line: it kills your shell (exit 144). Restart
  `next start` after every rebuild.
- **Workers:**
  - `@cloudflare/vitest-pool-workers` 0.22 needs Vitest 4 (TD-2), and its bundled `workerd` caps
    `compatibility_date` at 2026-08-22.
  - In this sandbox, `wrangler dev` can't fetch public hosts, so local live scans don't work. The
    fake-browser Worker tests plus real-Chromium calibration are the substitute.
  - `apps/scanner` sets `keep_names: false` so `collector.ts` survives `fn.toString()`.
- **Browser Run:** `@cloudflare/playwright` 1.3.6 tracks the Playwright 1.58 API. It needs
  `nodejs_compat` and a compatibility date ≥ 2025-09-15. `launch()` accepts session `guardrails` (an
  outbound allowlist; P4).
- **Locator gotcha:** Next's route announcer is also `role="alert"`; filter alerts by text in specs.
- **Turborepo:** `turbo` may rewrite `AGENTS.md`'s managed block. Keep it committed. The project pointer
  sits outside the block.

## 9. Definition of done (each step)

- `pnpm check`, `pnpm build` and `pnpm test:e2e` pass locally and in CI, and INV-1…INV-3 (plus INV-4 once
  it exists) are green.
- `README.md`, the runbooks and `/privacy` match what's deployed and what the code collects, word for word.
- **Report back:**
  - what shipped
  - what's live (with URLs) versus deploy-ready, and why
  - every deviation from this brief and its reason
  - suggested additions to `docs/tech-debt.md`
  - answers you assumed for any unconfirmed P-item
