# Handoff: repo hardening → Vercel → events (Worker + D1) → scanner (Browser Run) → /listen

You're continuing SeeItMyWay, "the preference layer for the web". V0A (Browser Checkup) and V0B
(adaptive demo, Playground, Passport) are built. This document is your brief. The decisions below are
**locked by the product owner**: implement them, don't re-open them.

_Revision 2 (2026-10-11): TypeScript stays at 5.9; stated preferences vs. device constraints made
explicit; the GPC policy is decided; the browser-test invariants are named._

## 0. Start here

1. Repo: `davidsparrow/SeeItMyWay`. The prior work is on branch `claude/affectionate-edison-qoda63`.
   If `main` doesn't contain it yet, base your designated branch on it:

   ```bash
   git fetch origin claude/affectionate-edison-qoda63
   git checkout -B <your-branch> origin/claude/affectionate-edison-qoda63
   ```

2. Read `CLAUDE.md` (the working agreement), `AGENTS.md`, `README.md`, `docs/tech-debt.md` and
   `docs/instructions-review.md`. Skim the PRDs: `Seeitmyway-PRD` (§4, §8, §14–21, §26–29) and
   `Seeitmyway-PRD-prefix+addendum` (A, B, G, H).
3. Get a green baseline **before changing anything**: `pnpm install && pnpm check && pnpm build`.
   Expect 14 typecheck/test tasks, 61 unit tests, 7 static Next routes, the SDK's ESM + IIFE bundles and
   the demo-sites fixture.
4. Commit after each numbered step with all gates green. Push to your designated branch. Don't open a
   PR unless asked.

## 1. Locked decisions

1. **Keep the TypeScript monorepo.** `apps/web` stays the canonical Next.js app. Don't move the app to
   Cloudflare because the scanner needs Cloudflare.
2. **Hosting:** `apps/web` → Vercel. The events collector and `apps/scanner` → Cloudflare Workers; the
   scanner uses Browser Run. `packages/protocol`, `detector`, `sdk`, `adapters`, `privacy` and `types`
   stay deployment- and framework-independent: no Next, Vercel or Cloudflare imports.
3. **TypeScript stays at 5.9 (`~5.9.3`) for V0.** Don't upgrade to TS 7, don't add a dual-compiler
   setup, and don't spend time working around the TS 7 transition. It's logged as **TD-1** in
   `docs/tech-debt.md`, to revisit once Next.js's TypeScript 7 / native compiler-API support is stable
   for pnpm + Turborepo monorepos.
4. **Biome** for repo-wide formatting and linting, with monorepo scripts so format/lint, typecheck,
   tests and builds are all CI gates.
5. **Anonymous research/event counts → Cloudflare Worker + D1** (not Redis/Upstash).
   - Collection stays limited to the existing fixed allowlist (`packages/privacy/src/events.ts`).
   - Don't add analytics fields without documenting the privacy implications.
   - `/privacy` must keep showing exactly what can be collected.
6. **Global Privacy Control means no research events leave the browser.** When GPC is detected, send
   nothing to the events backend, even anonymous aggregate counts. Local-only state is fine. This is an
   intentional SeeItMyWay policy, stronger than the minimum meaning of GPC. Say so on `/privacy`, and
   surface it positively in the Browser Checkup with exactly this copy:
   “Global Privacy Control detected — SeeItMyWay heard you. Anonymous research counting is disabled for
   this visit.”
7. **Stated preferences vs. device constraints.**
   - Passport and Tune settings are the visitor's _stated_ preferences. They must stay independently
     storable even when the current device stops them taking effect.
   - Don't grey out Full Motion or Autoplay Allowed just because the current OS requests reduced motion.
     Let the setting be saved, and visibly explain that a device constraint is overriding its effective
     behavior.
   - `motion` and `autoplay` stay separate protocol dimensions. Reduced or minimal motion suppresses
     autoplay of media that creates **non-essential visual motion**. It doesn't redefine the stored
     autoplay preference, and it doesn't stop audio-only media from autoplaying.
   - Effective behavior = stated preferences combined with current-device constraints.
   - Forced colors and comparable hard accessibility constraints override explicit theme choices. An
     explicit Passport/site light or dark choice may still override an ordinary device
     `prefers-color-scheme`.
8. **Package scope stays `@simw/`.**
9. **Don't block on the final domain.** Production is a standard `<project>.vercel.app` URL for now.
   Parameterize the site, CDN, events and scanner URLs via config/env. Keep protocol version and
   identity (`urn:simw:protocol:0.1`) logically separate from any commercial hostname.
10. **Keep both `AGENTS.md` and `CLAUDE.md` committed.**
11. **Missing credentials never block progress.** If Vercel or Cloudflare credentials aren't available,
    finish the work and test it locally, write the exact deployment steps down, and move to the next
    non-blocked task.
12. **The Passport extension stays out of scope.**

### Sequence

1. Repo hardening (§2)
2. Deploy `apps/web` to Vercel (§3)
3. Cloudflare Worker + D1 event ingestion, including the GPC policy (§4)
4. V0C scanner with Browser Run (§5)
5. Connect scanner results to `/listen` (§6)

### Browser-test invariants (named, CI-gated from step 1 onward)

| ID        | Invariant                                                                                                                             | How it's checked today                                                                                                                                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **INV-1** | OS preference changes are detected live and the experience updates and celebrates without a refresh.                                  | Reveal the Checkup, then `page.emulateMedia({ reducedMotion: 'reduce' })`. The toast "🎉 Your browser now asks websites for reduced motion." appears, the Motion card reads "Reduced motion requested", and `<html data-simw-motion="reduced">` is set. Also, with no GPC, `preference_changed` is recorded locally. |
| **INV-2** | A stored dark Passport on a light device gives a dark first paint on later navigations, with no light-theme flash.                    | On a light device, save a Passport with `colorScheme: dark`, then navigate. At `waitUntil: 'commit'` (before hydration), `<html data-simw-color-scheme="dark">` is already set by the inline boot script (`packages/sdk/src/boot.ts`).                                                                               |
| **INV-3** | The plain-HTML, framework-independent SDK respects reduced-motion constraints and suppresses inappropriate autoplaying visual motion. | `apps/demo-sites` `index.html` (npm) and `script-tag.html` (`<script data-simw-auto>`) under emulated reduced motion: `video.autoplay === false`, `data-simw-motion="reduced"`, and the infinite `.badge` animation's iteration count is `1`.                                                                        |

Use the IDs in test names (e.g. `test('INV-2: dark Passport paints dark first', …)`) so a CI failure
names the broken promise. INV-3 must keep passing **after** the §2d semantics change: the fixture's
`<video>` is visual motion, so it stays suppressed even though the stated autoplay preference is no
longer rewritten.

## 2. Step 1: repo hardening

### 2a. TypeScript: no change

Stay on `~5.9.3`. Do nothing else here. If a tool or dependency pushes toward TS 7, stop and note it
under TD-1 instead of working around it.

### 2b. Biome (replace Prettier)

- Add `@biomejs/biome` (2.5.x, pinned exactly) at the root with a root `biome.json`. Remove Prettier
  (the `prettier` devDep, `.prettierrc.json`, `.prettierignore`, and the `format`/`format:check`
  scripts) so there's one formatter.
- Match today's style: 2-space indent, line width 100, single quotes in JS/TS, double quotes in JSX
  attributes, trailing commas everywhere, semicolons.
- Ignore `Seeitmyway-PRD*`, `**/dist`, `**/.next`, `**/.turbo`, `**/node_modules`, `pnpm-lock.yaml` and
  `apps/web/next-env.d.ts`.
- CSS: `apps/web/src/app/globals.css` uses Tailwind v4 at-rules (`@import 'tailwindcss'`, `@source`,
  `@theme`, `@custom-variant`). Enable Biome's Tailwind directive parsing, or exclude that one file.
  Don't let the linter rewrite those at-rules.
- Lint from `recommended`. Fix real findings rather than blanket-disabling rules. Where a rule conflicts
  with an intentional pattern (e.g. the `dangerouslySetInnerHTML` boot script in
  `apps/web/src/app/layout.tsx`), use a targeted `biome-ignore` with a reason.
- Root scripts:
  - `lint` → `biome check .`
  - `lint:fix` → `biome check --write .`
  - `format` → `biome format --write .`
  - `check` → `biome ci .` plus `turbo run typecheck test`
  - `build` stays `turbo run build`
- `.github/workflows/ci.yml` gates, in order: `pnpm install --frozen-lockfile`, `biome ci .`,
  typecheck, unit tests, build, then the e2e invariants (§2f).
- Update the Prettier mentions in `CLAUDE.md` "Commands" and in `README.md`.

### 2c. Configuration instead of hostnames

Add typed config in `apps/web/src/lib/config.ts`. Read env once; every value is optional with a sane
local default:

| Var                       | Use                                        | Default                                                                                                 |
| ------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`    | `metadataBase`, absolute links, share text | `https://` + Vercel's `VERCEL_PROJECT_PRODUCTION_URL` when on Vercel, otherwise `http://localhost:3000` |
| `NEXT_PUBLIC_SDK_URL`     | the `<script>` snippet on `/listen`        | site URL + `/sdk/simw.global.js`                                                                        |
| `NEXT_PUBLIC_EVENTS_URL`  | events Worker base URL (§4)                | unset: local-only telemetry (today's behavior)                                                          |
| `NEXT_PUBLIC_SCANNER_URL` | scanner Worker base URL (§5)               | unset: `/listen` keeps today's "coming soon" state                                                      |

- Serve the SDK's IIFE build from the web app itself. For example, copy
  `packages/sdk/dist/simw.global.js` into a git-ignored `apps/web/public/sdk/` during a turbo-cached
  build step. The snippet then works on the Vercel URL without a CDN, and a CDN stays swappable via
  `NEXT_PUBLIC_SDK_URL`.
- Protocol identity stays `urn:simw:protocol:${PROTOCOL_VERSION}` (`packages/protocol/src/packet.ts`).
  If you publish the JSON Schema at a URL, that URL is documentation, never part of the identity.
- Remove the hard-coded `https://cdn.example.com/simw.global.js` placeholder from
  `apps/web/src/app/(site)/listen/page.tsx`.

### 2d. Stated preferences vs. effective behavior (decision 7)

Current code that conflicts with the decision:

- `packages/protocol/src/precedence.ts`: `resolveExperience` **rewrites** `autoplay` to `'never'` (and
  sets `sources.autoplay = 'native'`) when the OS reduces motion. It does the same for Save-Data and
  reduced data.
- `packages/adapters/src/policies.ts`: `autoplayMode()` treats `motion: 'minimal'` as autoplay off for
  all media, audio included.
- Three UIs **disable** choices instead of explaining constraints:
  - `apps/web/src/passport/passport-builder.tsx` greys out `motion: full` and `autoplay: allowed|muted` when the OS reduces motion.
  - `apps/web/src/northlight/tune-panel.tsx` does the same.
  - `apps/web/src/playground/playground.tsx` greys out autoplay options when motion isn't full.

Target model. You choose the exact shape, but every point below must be true and tested:

- **Resolution separates the two layers.** It returns:
  - the _stated_ preferences after precedence (override → Passport → site default → protocol default),
    with no device constraints applied
  - the _effective_ experience
  - the list of active _constraints_, each with a reason (e.g. `os-reduced-motion`, `save-data`,
    `forced-colors`), so UIs can explain them
- **`autoplay` is never rewritten.** With OS reduced motion and Passport `autoplay: 'allowed'`:
  - stated autoplay is `'allowed'`, sourced from the Passport
  - the effective experience still carries autoplay `'allowed'`
  - an active `os-reduced-motion` constraint is reported
- **Effective motion may be constrained.** OS reduced motion raises effective motion to at least
  `reduced`. Stated motion keeps whatever the visitor chose, e.g. `full`.
- **Media policy distinguishes visual motion from audio.** Give `autoplayMode` (or its replacement) a
  media kind. For example: `autoplayMode(exp, { visualMotion: boolean, essential?: boolean })`.
  - Visual-motion media (video, animated hero, timelapse) is `'off'` whenever effective motion is
    `reduced` or `minimal`, unless explicitly marked essential. Otherwise it follows the autoplay
    preference.
  - Audio-only media follows the autoplay preference alone. Reduced or minimal motion doesn't block it.
  - Save-Data / reduced data is a separate constraint: heavy media isn't loaded automatically. Model it
    the same way, without rewriting the autoplay preference.
- **Nothing stored changes.** Add a test that resolves and then re-reads storage, proving Passport and
  Tune values are untouched.
- **All consumers move to the effective policy:**
  - the safe autoplay adapter (`packages/adapters/src/safe.ts`), which treats `<video>` as visual
    motion and `<audio>` as audio-only
  - Northlight's `Timelapse`
  - the carousel (`allowsAutoAdvance`)

  INV-3 must stay green.

- **UIs store and explain.** Passport, Tune and Playground let visitors pick any value and save it.
  Where a device constraint overrides it, show a visible note in plain language, e.g. "Saved as Full.
  Your device is asking for reduced motion right now, so this site plays it calm. Your choice still
  applies on devices that don't." Don't disable the option.
- **Update the docs and tests that encode the old rule:** the protocol tests asserting `autoplay === 'never'` under reduced motion and Save-Data, the adapter tests for `autoplayMode`, and the "Product
  rules" section of `CLAUDE.md` (describe stated vs. effective there).

### 2e. Hard accessibility constraints (decision 7)

- With `forced-colors: active`, the effective color scheme follows the device even when the Passport or
  site explicitly says light or dark. (Forced colors sets `prefers-color-scheme` from the Canvas color.)
  Translucency and seed variation are off. Report it as a constraint; leave the stated theme stored.
  Test it.
- Keep: an explicit light/dark choice overrides an ordinary device `prefers-color-scheme` (existing
  test).
- Keep: `prefers-contrast: more` disables seed variation (existing test).
- Treat any future hard requirement the same way: the device constraint wins over explicit presentation
  choices, the stated preference stays stored, and the UI explains why.

### 2f. Browser-test invariants in CI

- Add a workspace package (e.g. `tests/e2e`, named `@simw/e2e`) with `@playwright/test`. It runs
  INV-1…INV-3 (§1) against built output: `next start` for `apps/web` and `vite preview` for
  `apps/demo-sites`, via Playwright `webServer`.
- Emulate preferences with `page.emulateMedia({ reducedMotion, colorScheme, forcedColors })`. Emulate
  GPC with `page.addInitScript` defining `navigator.globalPrivacyControl = true` (needed for §4's tests).
- In a Claude Code cloud container, Chromium is pre-installed at `/opt/pw-browsers` and
  `PLAYWRIGHT_BROWSERS_PATH` is set. Pin `@playwright/test` to `1.56.1` to match its `chromium-1194`,
  or launch with `executablePath: '/opt/pw-browsers/chromium'`. **Never run `playwright install`
  there.** In GitHub Actions, run `pnpm exec playwright install --with-deps chromium` before the tests.
- Wait for `load`, not `networkidle`: Next's link prefetching keeps the network busy.
- Add a `test:e2e` script and a CI job that runs after `build`. A failing invariant fails CI.

### 2g. AGENTS.md

`AGENTS.md` is Turborepo's managed block, which `turbo` re-adds on agent-detected runs. Keep the block
as-is, and add a short pointer **outside** it: "Project rules: see CLAUDE.md". Non-Claude agents then
get the same working agreement.

## 3. Step 2: deploy `apps/web` to Vercel

A standard `<project>.vercel.app` production URL is the plan; no custom domain yet. Keep in mind:

- **Storage is per origin.** Passport, Tune overrides, seeds and Checkup history live in
  `localStorage`. Moving to a custom domain later starts every visitor fresh, which is acceptable now.
  Pick a project name that keeps the production URL stable (e.g. `seeitmyway`).
- **Preview deployments are separate origins** (`<project>-<hash>-<team>.vercel.app`). Each gets its
  own storage, and the Cloudflare Workers must allow them through a pattern-based CORS allowlist (§4).
- `vercel.app` is on the Public Suffix List. That's irrelevant to us: we use no cookies.
- `NEXT_PUBLIC_SITE_URL` falls back to `VERCEL_PROJECT_PRODUCTION_URL` (§2c), so adding a domain later
  is a config change, not a code change.

Steps:

- Vercel project settings: Root Directory `apps/web`, framework Next.js, Node 22, pnpm install at the
  repo root (Vercel detects workspaces), and "Include files outside the root directory" enabled. Add
  `apps/web/vercel.json` only for settings that can't be inferred. `turbo-ignore` is optional.
- You can't use Vercel's dashboard. If a `VERCEL_TOKEN` (plus org and project IDs) is available as an
  environment secret, deploy with the Vercel CLI.
- Otherwise:
  1. Write the exact dashboard steps and env var list into `docs/deploy/vercel.md`.
  2. Tell the product owner. In a Claude Code cloud session, read the environment documentation page on
     secrets so they get a direct link for adding the token.
  3. Continue with step 3; it doesn't depend on the deploy.
- If deployed, smoke-test the production URL with the e2e suite (`BASE_URL` env).

## 4. Step 3: events Worker + D1

Create `apps/events` as a Cloudflare Worker with D1 (TypeScript, `wrangler` 4.x,
`@cloudflare/workers-types`, tests with `@cloudflare/vitest-pool-workers`). It imports `@simw/privacy`,
which is framework-free; wrangler's esbuild bundles workspace TS source.

- **Endpoint:** `POST /v1/events` with body `{ events: AnonymousEvent[] }`. Cap it at about 20 events
  per request with a small body limit. Every event goes through `sanitizeEvent`; drop anything invalid
  silently and never echo input.
- **Store aggregates only.** No individual events, IPs, user agents, referrers, countries, cookies or
  request IDs.
  - Suggested table: `event_counts(day TEXT, name TEXT, props TEXT, count INTEGER, PRIMARY KEY (day, name, props))`.
  - `day` is the UTC date. `props` is canonical (sorted-key) JSON of the already-allowlisted props.
  - Write with an UPSERT increment. Migrations live in `apps/events/migrations`.
- **Logging:** don't log request bodies. Keep Workers logs/observability off, or verify they can't
  capture IPs or bodies, and document what Cloudflare itself retains. If you rate-limit, use Workers'
  Rate Limiting binding (ephemeral, never written to D1) and say so on `/privacy`.
- **CORS:** an `ALLOWED_ORIGINS` var (comma list that supports the project's `*.vercel.app` preview
  pattern), with `POST`/`OPTIONS` only.
- **Summary endpoint:** `GET /v1/summary` returns totals passed through `suppressSmallCohorts` (minimum
  50). It's for a future "State of Web Preference Awareness" report; no UI yet.
- **Web sink** (`apps/web/src/lib/telemetry.ts`): when `NEXT_PUBLIC_EVENTS_URL` is set, register a sink
  that batches events and flushes on `pagehide`/`visibilitychange` via `navigator.sendBeacon`, with a
  `fetch` `keepalive` fallback. `TELEMETRY_MODE` derives from config. Wish-list free-text suggestions
  still never leave the device.

### 4a. GPC policy (decision 6)

- **Client:** at send time, if `navigator.globalPrivacyControl === true`, the remote sink sends nothing
  for that visit. Events may still go to the local log that `/privacy` displays; local-only state is
  fine. Read GPC directly in the telemetry module, since it isn't React-bound.
- **Worker, as defense in depth:** discard any request carrying `Sec-GPC: 1` without storing it. Return
  `204`, so behavior doesn't reveal the policy check.
- **Browser Checkup:** when GPC is detected, show this message prominently in the results (near the
  summary, and on the Privacy signal card), linking to `/privacy`:
  “Global Privacy Control detected — SeeItMyWay heard you. Anonymous research counting is disabled for
  this visit.”
- **All counting-related copy must be true under GPC.** Today these places imply something is counted:
  - the awareness questions ("Answers are anonymous…"): hide them, or say they aren't counted this visit
  - the wish-list status line
  - the extension upsell's "Thanks, noted"
  - the `/listen` interest form

  Each needs a GPC-aware variant.

- **`/privacy`:** state the policy plainly, as an intentional SeeItMyWay choice that goes further than
  GPC requires. With GPC on, no research events are sent at all; only local, on-device state remains.
  Keep the event table and the local log viewer accurate.
- **Tests:**
  - unit: the sink with GPC on sends nothing
  - Worker: a `Sec-GPC: 1` request stores nothing
  - e2e: GPC emulated → the Checkup message is visible and no request reaches the events URL (use
    Playwright request interception to assert zero calls)
- **Credentials:** without `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, build and test locally
  (`wrangler dev --local` / Miniflare with a local D1). Stop at deploy-ready and document the deploy in
  `apps/events/README.md`: `wrangler d1 create`, the binding id, `wrangler d1 migrations apply --remote`, `wrangler deploy` and the env vars.

## 5. Step 4: V0C scanner (Site Listener Test)

Follow `apps/scanner/README.md`. Read Cloudflare's current Browser Run docs before coding: the product
and package names have changed recently. `@cloudflare/playwright` (1.3.x) and `@cloudflare/puppeteer`
(1.4.x) are on npm. Prefer Playwright, for parity with the e2e suite.

- **Analysis logic** goes in a framework-free package (e.g. `packages/scanner-core`): collected page
  facts in; checks, a score and a typed `ScanReport` out. That makes it unit-testable in Node without a
  browser, and `apps/web` imports the report type from there.
- **Per URL:** load the page once normally, then with each of these emulated: `prefers-reduced-motion: reduce`, `prefers-color-scheme: dark`, `prefers-contrast: more`, `forced-colors: active`. Collect and
  compare:
  - CSSOM rules for each `prefers-*` / `forced-colors` query
  - computed-style or screenshot differences between runs
  - visual-motion media still autoplaying under reduced motion ("✕ Hero video ignores motion
    preference"); audio-only autoplay is a separate, softer finding, consistent with §2d
  - auto-advancing carousels (DOM mutations over a few seconds under reduced motion)
  - infinite CSS animations still running under reduced motion
  - hover-only reveals (a heuristic; label the finding "possible")
- **Output:** the Preference Awareness Score and ✓ / △ / ✕ rows (PRD B.1). Document the scoring rubric;
  it must be deterministic.
- **Calibration:** use `apps/demo-sites` (the Bramble fixture, with and without the SDK) and the
  Northlight demo as known-good and known-bad pages.
- **Abuse/SSRF guards:**
  - http(s) on default ports only
  - reject IP literals, `localhost`, private, link-local and metadata ranges, and internal hostnames
  - scan one page; no crawling in V0C
  - timeouts and a page-weight cap
  - no cookies or credentials, and an honest user agent
  - per-origin and global rate limits
  - strip query strings and fragments, and say so in the UI
- **Storage:** reports in D1 under a random id, with a retention cron (e.g. 30 days). Any screenshots
  are short-lived. A site URL isn't personal data, but keep only what the report needs.
- **Credentials:** same rule as §4. Build and test locally; stop at deploy-ready.

## 6. Step 5: connect the scanner to `/listen`

- `apps/web/src/app/(site)/listen/listen-form.tsx` posts to `NEXT_PUBLIC_SCANNER_URL`, shows progress,
  then renders the report:
  - the score and ✓/△/✕ rows
  - "See your site through different visitor preferences": the scanner's emulated views if available,
    otherwise a link to `/playground`
  - a shareable report page (e.g. `/listen/report/[id]`)
- **Fix the copy.** It currently says "your address wasn't sent anywhere". Once the scanner is
  connected, the page must say exactly what happens: one public page loaded from Cloudflare's network,
  and the report kept for N days. Keep the accessibility disclaimer (PRD §26): no compliance claims.
- `owner_test_interest` stays, and obeys the GPC policy. Any new event (e.g. a score bucket) must be:
  - added to `ANONYMOUS_EVENTS` with closed values
  - described on `/privacy`
  - noted, with its privacy implications, in the commit message
- With `NEXT_PUBLIC_SCANNER_URL` unset, the page keeps today's "coming soon" behavior.

## 7. Out of scope

- The Passport browser extension (`apps/extension`).
- TypeScript 7 (TD-1).
- Accounts, billing, the owner dashboard, template clustering and crawling.
- Vocabulary changes (`packages/protocol/src/vocabulary.ts`). §2d changes the resolver and policies,
  not the vocabulary.
- Marking `needs-review` "Show me how" instructions as verified without a primary source
  (`docs/instructions-review.md`).

## 8. Environment notes (from the previous session)

- **Network:** the proxy blocks `developer.mozilla.org` and vendor help sites (Apple, Microsoft, Google,
  Mozilla). `raw.githubusercontent.com` works, so read `mdn/content` and `mdn/browser-compat-data`
  there. The npm registry works.
- **Preview servers:**
  - Run `next start` as a background task.
  - After every rebuild, restart it: a running `next start` serves stale chunks and returns 500s.
  - To stop it, kill the `next-server` process by PID. Don't `pkill -f "next start …"` from a command
    whose own text matches the pattern: it kills your shell (exit 144).
- **Playwright:** the global module is `/opt/node22/lib/node_modules/playwright` (1.56.1).
- **Turborepo:** `turbo` may rewrite `AGENTS.md`'s managed block. Keep it committed.

## 9. Definition of done (each step)

- `pnpm check` (Biome, typecheck and unit tests), `pnpm build` and the e2e invariants pass locally and
  in CI.
- INV-1, INV-2 and INV-3 are green.
- `README.md` "What's built" and "Status and known gaps" reflect reality, including anything that's
  deploy-ready but not deployed, and why.
- `/privacy` matches what the code collects, word for word, including the GPC policy.
- Report back:
  - what shipped
  - what's deployed versus deploy-ready, and why
  - every deviation and its reason
  - anything you think should be added to `docs/tech-debt.md`
