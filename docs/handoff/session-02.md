# Handoff: repo hardening → Vercel → events (Worker + D1) → scanner (Browser Run) → /listen

You're continuing SeeItMyWay, "the preference layer for the web". V0A (Browser Checkup) and V0B (adaptive
demo, Playground, Passport) are built. This document is your brief. The decisions below are **locked by the
product owner**: implement them, don't re-open them.

## 0. Start here

1. Repo: `davidsparrow/SeeItMyWay`. The prior work is on branch `claude/affectionate-edison-qoda63`
   (commit `a29a50f` and later). If `main` doesn't contain it yet, base your designated branch on it:
   `git fetch origin claude/affectionate-edison-qoda63 && git checkout -B <your-branch> origin/claude/affectionate-edison-qoda63`.
2. Read `CLAUDE.md` (the working agreement), `AGENTS.md`, `README.md` and `docs/instructions-review.md`.
   Skim the PRDs: `Seeitmyway-PRD` (§4, §8, §14–21, §26–29) and `Seeitmyway-PRD-prefix+addendum`
   (A, B, G, H).
3. Get a green baseline **before changing anything**: `pnpm install && pnpm check && pnpm build`
   (14 typecheck/test tasks, 61 unit tests; 7 static Next routes; SDK ESM + IIFE; demo-sites fixture).
4. Commit after each numbered step with all gates green. Push to your designated branch. Don't open a PR
   unless asked.

## 1. Locked decisions

1. **Keep the TypeScript monorepo.** `apps/web` stays the canonical Next.js app. Don't move the app to
   Cloudflare because the scanner needs Cloudflare.
2. **Hosting:** `apps/web` → Vercel. `apps/scanner` (and the events collector) → Cloudflare Workers;
   the scanner uses Browser Run. `packages/protocol`, `detector`, `sdk`, `adapters`, `privacy`, `types`
   stay deployment- and framework-independent (no Next, no Vercel, no Cloudflare imports).
3. **TypeScript 7.x (stable)**, repo-wide. Run the full typecheck/build/test suite after upgrading. Pin
   backward **only** for a concrete incompatibility, as narrowly as possible, and document it.
4. **Biome** for repo-wide formatting and linting, with monorepo scripts so format/lint, typecheck, tests
   and builds are all CI gates.
5. **Anonymous research/event counts → Cloudflare Worker + D1** (not Redis/Upstash). Collection stays
   limited to the existing fixed allowlist (`packages/privacy/src/events.ts`). Don't add analytics fields
   without documenting the privacy implications. `/privacy` must keep showing exactly what can be
   collected.
6. **Motion and autoplay stay separate protocol preferences.** Accessibility and environment constraints
   restrict _effective_ behavior without rewriting stored preferences:
   - OS `prefers-reduced-motion` must suppress non-essential **moving** autoplay even if the Passport says
     `autoplay: allowed`, but `autoplay` itself must **not** be redefined as `never`.
   - Forced colors and other hard accessibility requirements override presentation choices.
   - An explicit Passport/site light or dark choice may override the ordinary device `prefers-color-scheme`.
7. **Package scope stays `@simw/`.**
8. **Don't block on the final domain.** Parameterize site, CDN, event and scanner URLs via configuration
   or env vars. Keep protocol version and identity (`urn:simw:protocol:0.1`) logically separate from any
   commercial hostname.
9. **Keep both `AGENTS.md` and `CLAUDE.md` committed.**
10. **Don't start the Passport extension.**

### Sequence

1. Repo hardening (§2 below)
2. Deploy `apps/web` to Vercel (§3)
3. Cloudflare Worker + D1 event ingestion (§4)
4. V0C scanner with Browser Run (§5)
5. Connect scanner results to `/listen` (§6)

### Behaviors that must not regress (put them under automated test in step 1)

- **Live OS preference-change detection and celebration.** With the Checkup revealed, flipping the OS
  "reduce motion" setting shows the toast "🎉 Your browser now asks websites for reduced motion.", updates
  the Motion card, sets `<html data-simw-motion="reduced">`, and records `preference_changed {signal:
'prefers-reduced-motion', to: 'reduce'}`.
- **Dark Passport from first paint, no light flash.** On a light device, save a Passport with
  `colorScheme: dark`. The next navigation has `<html data-simw-color-scheme="dark">` at
  `waitUntil: 'commit'` (before hydration), applied by the inline boot script (`packages/sdk/src/boot.ts`).
- **Plain-HTML SDK suppresses inappropriate autoplay and motion.** `apps/demo-sites` (`index.html` via
  npm, `script-tag.html` via `<script data-simw-auto>`) under emulated reduced motion: `video.autoplay ===
false`, `data-simw-motion="reduced"`, the infinite `.badge` animation's iteration count is `1`.

## 2. Step 1: repo hardening

### 2a. TypeScript 7

Facts checked on 2026-10-11:

- `typescript@7.0.2` is `latest` (the native port). Its package exports **only** `./lib/version.cjs` plus
  `./unstable/*` APIs. The classic JavaScript compiler API (`ts.createProgram`, …) is not available.
  It does ship a `tsc` binary.
- Next.js 16.4's `next build` runs its own "Running TypeScript" step via `require('typescript')`. Expect a
  concrete incompatibility there. Our own `tsc --noEmit` gates should work with TS 7.
- tsup's `.d.ts` generation also needs the old API. The SDK build doesn't emit `.d.ts` today, so this
  isn't a blocker yet.
- TS 7 removes or changes deprecated options. Check `tooling/tsconfig/base.json` (`moduleResolution:
"Bundler"`, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, …) against the TS 7 release notes.

Decision tree:

1. Upgrade every `typescript` devDependency to `^7.0.2`. Run `pnpm check` and `pnpm build`.
2. If only Next's internal type-check step fails, the narrowest fix is to keep TS 7 as the type-check gate
   (`apps/web` `typecheck` script runs TS 7 `tsc --noEmit`). Then use the Next-documented way to skip
   Next's duplicate check (`typescript.ignoreBuildErrors`), **only if** CI still runs the TS 7 typecheck.
   If Next needs the TS API for anything beyond that check (e.g. `next typegen`), pin TS 6.x **in
   `apps/web` only** and keep TS 7 everywhere else.
3. Record whatever you hit (exact error text, and which package is pinned and why) in `README.md` under
   "Status and known gaps".

### 2b. Biome (replace Prettier)

- Add `@biomejs/biome` (2.5.x, pin exactly) at the root with a root `biome.json`. Remove Prettier
  (`prettier` devDep, `.prettierrc.json`, `.prettierignore`, the `format`/`format:check` scripts) so
  there's one formatter.
- Match today's style: 2-space indent, line width 100, single quotes (JS/TS), double quotes in JSX
  attributes, trailing commas everywhere, semicolons.
- Ignore: `Seeitmyway-PRD*`, `**/dist`, `**/.next`, `**/.turbo`, `**/node_modules`, `pnpm-lock.yaml`,
  `apps/web/next-env.d.ts`.
- CSS: `apps/web/src/app/globals.css` uses Tailwind v4 at-rules (`@import 'tailwindcss'`, `@source`,
  `@theme`, `@custom-variant`). Enable Biome's Tailwind directive parsing or exclude that one file;
  don't let the linter rewrite those at-rules.
- Lint: start from `recommended`. Fix real findings rather than blanket-disabling rules. Where a rule
  conflicts with an intentional pattern (e.g. a `dangerouslySetInnerHTML` boot script in
  `apps/web/src/app/layout.tsx`), use a targeted `biome-ignore` with a reason.
- Scripts (root `package.json`): `lint` → `biome check .`, `lint:fix` → `biome check --write .`,
  `format` → `biome format --write .`, `ci:static` → `biome ci .`. Make `check` = `biome ci .` +
  `turbo run typecheck test`. Keep `build` = `turbo run build`.
- Update `.github/workflows/ci.yml` gates: `pnpm install --frozen-lockfile` → `pnpm lint` (`biome ci`)
  → `pnpm typecheck` → `pnpm test` → `pnpm build` → e2e (2f).
- Update `CLAUDE.md` "Commands", and the Prettier mentions in `README.md`.

### 2c. Configuration instead of hostnames

Add typed config (`apps/web/src/lib/config.ts`). Read env once; every value is optional with a sane local
default:

| Var                       | Use                                        | Default                                                                            |
| ------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`    | `metadataBase`, absolute links, share text | `https://${VERCEL_PROJECT_PRODUCTION_URL}` on Vercel, else `http://localhost:3000` |
| `NEXT_PUBLIC_SDK_URL`     | the `<script>` snippet on `/listen`        | `${SITE_URL}/sdk/simw.global.js`                                                   |
| `NEXT_PUBLIC_EVENTS_URL`  | events Worker base URL (§4)                | unset → local-only telemetry (current behavior)                                    |
| `NEXT_PUBLIC_SCANNER_URL` | scanner Worker base URL (§5)               | unset → `/listen` shows the current "coming soon" state                            |

- Serve the SDK's IIFE build from the web app (e.g. copy `packages/sdk/dist/simw.global.js` to
  `apps/web/public/sdk/` in a turbo-cached build step, git-ignored) so the snippet works on the Vercel
  URL without a CDN. Keep the CDN swappable via `NEXT_PUBLIC_SDK_URL`.
- Protocol identity stays `urn:simw:protocol:${PROTOCOL_VERSION}` in `packages/protocol/src/packet.ts`.
  If you publish the JSON Schema at a URL, that URL is documentation, never part of the identity.
- Remove the hard-coded placeholder `https://cdn.example.com/simw.global.js` from
  `apps/web/src/app/(site)/listen/page.tsx`.

### 2d. Motion/autoplay semantics (decision 6)

Current code that conflicts with the decision:

- `packages/protocol/src/precedence.ts` `resolveExperience` _raises_ `autoplay` to `'never'` (and sets
  `sources.autoplay = 'native'`) when the OS reduces motion, and also on Save-Data / reduced data.
- `packages/adapters/src/policies.ts` `autoplayMode()` returns `'off'` for `motion: 'minimal'` (keep that
  effect, but express it as a motion constraint, not as autoplay).
- UIs block choices instead of explaining constraints:
  - `apps/web/src/passport/passport-builder.tsx` disables `motion: full` and `autoplay: allowed|muted`
    when the OS reduces motion. The Passport is **portable**: a device constraint must never stop someone
    storing `full`/`allowed` for use elsewhere.
  - `apps/web/src/northlight/tune-panel.tsx` disables the same options.
  - `apps/web/src/playground/playground.tsx` disables autoplay options when motion isn't full.

Target behavior. Choose the exact shape, but these must be true and tested:

- `resolveExperience` never rewrites `autoplay`. With OS reduce + Passport `autoplay: 'allowed'`:
  `experience.autoplay === 'allowed'` and `sources.autoplay === 'passport'`.
- Effective behavior comes from constraints. For example, add `Resolution.constraints` (or an
  `effective` object) with `motionBlocksMovingAutoplay` and `dataBlocksHeavyMedia`, and/or give
  `autoplayMode(exp, { moving: boolean, essential?: boolean })` a media kind: moving video/animation is
  `'off'` when effective motion ≠ `full` or data is reduced; audio-only follows the autoplay preference.
  Keep `experience.motion` as the _effective_ motion (raising it to `reduced` is allowed). Expose the
  visitor's _stated_ preferences too (e.g. `Resolution.stated`) so the UI can say "You chose Full; your
  device limits this to Reduced."
- Stored Passport/Tune values are never mutated by resolution. Add a test that resolves and then
  re-reads storage.
- The safe autoplay adapter (`packages/adapters/src/safe.ts`), Northlight's `Timelapse`, and the
  carousel (`allowsAutoAdvance`) use the new effective policy. Regression behavior 3 must still pass.
- UIs let people store any value and show the effective-state note instead of disabling options.
- Update the protocol tests that currently assert `autoplay === 'never'` under reduced motion and
  Save-Data, and update the "Product rules" section of `CLAUDE.md`.

### 2e. Hard accessibility requirements (decision 6)

- With `forced-colors: active`, the effective `colorScheme` follows the device (forced colors sets
  `prefers-color-scheme` from the Canvas color), even if the Passport or site says otherwise.
  Translucency and seed variation are off. Test it.
- Keep: an explicit light/dark choice overrides an ordinary device `prefers-color-scheme` (existing test).
- Keep: OS reduced motion is a floor on effective motion; `prefers-contrast: more` disables seed variation.

### 2f. End-to-end regression suite

- Add a workspace package (e.g. `tests/e2e`, `@simw/e2e`) with `@playwright/test`. It covers the three
  behaviors in §1 against built output (`next start` for `apps/web`, `vite preview` for
  `apps/demo-sites`, via Playwright `webServer`).
- Emulate preferences with `page.emulateMedia({ reducedMotion, colorScheme, forcedColors })`. That's how
  the earlier manual verification was done.
- In this container, Chromium is pre-installed at `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH` is set):
  pin `@playwright/test` to `1.56.1` to match `chromium-1194`, or launch with `executablePath:
'/opt/pw-browsers/chromium'`. **Never run `playwright install` here.** In GitHub Actions, run
  `pnpm exec playwright install --with-deps chromium` before the tests.
- Wait for `load`, not `networkidle`: Next's link prefetching keeps the network busy.
- Add a `test:e2e` script and a CI job that runs after `build`.

### 2g. AGENTS.md

`AGENTS.md` is Turborepo's managed block (re-added by `turbo` on agent-detected runs). Keep the block
as-is, and add **outside** it a short pointer: "Project rules: see CLAUDE.md". Non-Claude agents then
get the same working agreement.

## 3. Step 2: deploy `apps/web` to Vercel

**Domain answer (from the product owner's question):** a standard `<project>.vercel.app` production URL is
fine; no custom domain is needed. Caveats to carry forward:

- **Storage is per origin.** Passport, Tune overrides, seeds and Checkup history live in `localStorage`
  on that origin. Moving to a custom domain later starts every visitor fresh. That's acceptable at this
  stage; just pick the project name so the production URL is stable (e.g. `seeitmyway`).
- **Preview deployments are separate origins** (`<project>-<hash>-<team>.vercel.app`): separate storage
  per preview, and the events/scanner Workers must allow them via CORS (pattern-based allowlist, §4).
- `vercel.app` is on the Public Suffix List. That's irrelevant to us: we use no cookies.
- Use `VERCEL_PROJECT_PRODUCTION_URL` (a Vercel system env var) as the fallback for
  `NEXT_PUBLIC_SITE_URL` (§2c), so adding a domain later is a config change, not a code change.

Steps:

- Vercel project settings: Root Directory `apps/web`, framework Next.js, Node 22, pnpm install at the
  repo root (Vercel detects workspaces), "Include files outside the root directory" enabled. Add
  `apps/web/vercel.json` only if a setting can't be inferred; `turbo-ignore` for skipping unchanged
  builds is optional.
- You can't click through Vercel's dashboard. If a `VERCEL_TOKEN` (plus org/project IDs) is available as
  an environment secret, deploy with the Vercel CLI. Otherwise write exact dashboard steps and the env
  var list into `docs/deploy/vercel.md`, tell the product owner, and **continue with step 3** (it doesn't
  depend on the deploy). In a Claude Code cloud session, use the environment documentation tool
  (`environment.secrets`) to show the product owner how to add the token.
- Smoke-test the production URL (if deployed) with the e2e suite (`BASE_URL` env).

## 4. Step 3: events Worker + D1

Create `apps/events` (Cloudflare Worker + D1, TypeScript, `wrangler` 4.x, `@cloudflare/workers-types`,
tests with `@cloudflare/vitest-pool-workers`). It imports `@simw/privacy` (framework-free); wrangler's
esbuild bundles workspace TS source.

- `POST /v1/events` with body `{ events: AnonymousEvent[] }` (max ~20 per request, small body limit).
  Every event goes through `sanitizeEvent`. Anything invalid is dropped silently; never echo input.
- **Store aggregates only.** No individual events, IPs, user agents, referrers, countries, cookies or
  request IDs. Suggested table: `event_counts(day TEXT, name TEXT, props TEXT, count INTEGER, PRIMARY
KEY (day, name, props))`. `day` is the UTC date; `props` is canonical (sorted-key) JSON of the
  already-allowlisted props. Write with an UPSERT increment. Migrations live in `apps/events/migrations`.
- Don't log request bodies. Keep Workers logs/observability off, or verify they can't capture IPs or
  bodies, and document what Cloudflare itself retains. If you rate-limit, use Workers' Rate Limiting
  binding (ephemeral, never written to D1) and say so on `/privacy`.
- CORS: `ALLOWED_ORIGINS` var (comma list, supports the project's `*.vercel.app` preview pattern), plus
  `POST`/`OPTIONS` only.
- `GET /v1/summary` returns totals passed through `suppressSmallCohorts` (minimum 50). It's for a future
  "State of Web Preference Awareness" report; no UI yet.
- Web side (`apps/web/src/lib/telemetry.ts`): when `NEXT_PUBLIC_EVENTS_URL` is set, register a sink that
  batches and flushes on `pagehide`/`visibilitychange` via `navigator.sendBeacon` (fetch `keepalive`
  fallback). `TELEMETRY_MODE` derives from config.
  - `/privacy` copy must stay exactly true in both modes. Add: "stored only as daily totals; no
    individual events are kept".
  - Wish-list free-text suggestions still never leave the device.
- **Open question for the product owner. Ask, don't decide:** should the site skip sending events when
  the browser sends Global Privacy Control? It only reduces collection, so the default recommendation is
  yes; describe it on `/privacy` if adopted.
- Without Cloudflare credentials (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`): build and test
  locally (`wrangler dev --local` / Miniflare, local D1). Stop at "deploy-ready", and document
  `wrangler d1 create`, the binding id, `wrangler d1 migrations apply --remote` and `wrangler deploy` in
  `apps/events/README.md`.

## 5. Step 4: V0C scanner (Site Listener Test)

Follow `apps/scanner/README.md`. Read Cloudflare's current Browser Run docs before coding: the product and
package names have changed recently. `@cloudflare/playwright` 1.3.x and `@cloudflare/puppeteer` 1.4.x are
on npm; prefer the Playwright one for parity with our e2e suite.

- Put the pure analysis logic in a framework-free package (e.g. `packages/scanner-core`). It takes
  collected page facts in and returns checks, a score and a typed `ScanReport` out, so it's unit-testable
  in Node without a browser. `apps/web` imports the report type from there.
- Per URL: load once normally, then with emulated `prefers-reduced-motion: reduce`,
  `prefers-color-scheme: dark`, `prefers-contrast: more`, `forced-colors: active`. Collect, then compare:
  - CSSOM rules for each `prefers-*` / `forced-colors` query
  - computed-style or screenshot differences
  - `video`/`audio` with autoplay still playing under reduced motion ("✕ Hero video ignores motion
    preference")
  - auto-advancing carousels: DOM mutations over a few seconds under reduced motion
  - infinite CSS animations still running under reduced motion
  - hover-only reveals (heuristic; label it "possible")

  Produce the Preference Awareness Score and ✓ / △ / ✕ rows (PRD B.1). Document the scoring rubric;
  it must be deterministic.

- Calibrate against `apps/demo-sites` (Bramble fixture with and without the SDK) and the Northlight demo:
  known-good and known-bad pages.
- Abuse/SSRF guards: http(s) only, default ports only, reject IP literals, `localhost`, private,
  link-local and metadata ranges, and internal hostnames. Scan one page (no crawling in V0C), set
  timeouts and a page-weight cap, send no cookies or credentials, use an honest user agent, and apply
  per-origin and global rate limits. Strip query strings and fragments and say so in the UI.
- Store reports in D1 under a random id, with a retention cron (e.g. 30 days). Screenshots, if any, are
  short-lived. A site URL isn't personal data, but keep only what the report needs.
- Same credential rule as §4: build and test locally, stop at deploy-ready without credentials.

## 6. Step 5: connect the scanner to `/listen`

- `apps/web/src/app/(site)/listen/listen-form.tsx` posts to `NEXT_PUBLIC_SCANNER_URL`, shows progress,
  then renders the report: score, ✓/△/✕ rows, and "See your site through different visitor preferences"
  (the scanner's emulated views if available, else a link to `/playground`).
  - Add a shareable report page (e.g. `/listen/report/[id]`).
- **Fix the copy:** it currently says "your address wasn't sent anywhere". When the scanner is
  connected, the page must say exactly what happens: one public page loaded from Cloudflare's network,
  report kept N days. Keep the accessibility disclaimer (PRD §26): no compliance claims.
- `owner_test_interest` stays. Any new event (e.g. a score bucket) must be added to `ANONYMOUS_EVENTS`
  with closed values, described on `/privacy`, and its privacy implications noted in the commit message.
- With `NEXT_PUBLIC_SCANNER_URL` unset, the page keeps today's "coming soon" behavior.

## 7. Out of scope

- The Passport browser extension (`apps/extension`): don't start it.
- Accounts, billing, the owner dashboard, template clustering and crawling.
- Changing the preference vocabulary (`packages/protocol/src/vocabulary.ts`), beyond what decision 6
  needs in the resolver.
- Marking `needs-review` "Show me how" instructions as verified without a primary source
  (`docs/instructions-review.md`).

## 8. Environment notes (from the previous session)

- The proxy blocks `developer.mozilla.org` and vendor help sites (Apple, Microsoft, Google, Mozilla).
  `raw.githubusercontent.com` works: read `mdn/content` and `mdn/browser-compat-data` there. The npm
  registry works.
- Preview servers:
  - Run `next start` as a background task.
  - After every rebuild, restart it: a running `next start` serves stale chunks (500s).
  - To stop one, kill the `next-server` process by PID. Don't `pkill -f "next start …"` from a command
    whose own text matches the pattern; it kills your shell (exit 144).
- The global Playwright module is `/opt/node22/lib/node_modules/playwright` (1.56.1).
- `turbo` may rewrite `AGENTS.md`'s managed block; keep it committed.

## 9. Definition of done (each step)

- `pnpm check` (Biome + typecheck + unit tests), `pnpm build` and the e2e suite pass locally and in CI.
- The three regression behaviors in §1 are green.
- `README.md` "What's built" and "Status and known gaps" reflect reality, including anything
  deploy-ready but not deployed, and why.
- `/privacy` matches what the code collects, word for word.
- Report back: what shipped, what's deployed versus deploy-ready, every pin or deviation with its reason,
  and any open questions (at minimum the GPC question in §4).
