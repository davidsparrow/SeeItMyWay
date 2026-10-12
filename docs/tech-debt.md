# Tech debt & review register

Deliberate deferrals: what we chose not to do yet, why, and what should trigger a second look. Add an
entry whenever a decision trades long-term cleanliness for V0 speed.

## TD-1: TypeScript 7

- **Status:** deferred. The repo stays on TypeScript `~5.9.3` for V0.
- **Logged:** 2026-10-11, by product-owner decision.
- **Decision:** don't upgrade to TS 7, don't run a dual-compiler setup (e.g. TS 7 for `tsc` gates plus
  TS 5/6 for Next.js), and don't spend V0 engineering time working around the transition.
- **Why:**
  - `typescript@7.0.2` (the native port, `latest` on npm as of 2026-10-11) exports only
    `./lib/version.cjs` plus `./unstable/*` APIs. It no longer provides the classic JavaScript compiler
    API (`ts.createProgram`, …), though it does ship a `tsc` binary.
  - Next.js 16.4's `next build` runs its own TypeScript check through `require('typescript')`, so it
    depends on that API.
  - tsup's `.d.ts` generation also uses the classic API. The SDK doesn't emit `.d.ts` files yet, but it
    will once the SDK is published.
- **Revisit when** Next.js documents stable support for TypeScript 7 / the native compiler API in pnpm +
  Turborepo monorepos, and the rest of the toolchain (tsup or its replacement, Vitest, Biome) is
  compatible.
- **Review steps:**
  1. On a branch, bump every `typescript` devDependency.
  2. Check `tooling/tsconfig/*.json` for options TS 7 removed or changed.
  3. Run `pnpm check`, `pnpm build` and the browser-test invariants (INV-1…INV-3).
  4. Adopt only if everything passes with a single compiler.

## TD-2: Vitest 4 and a pinned wrangler in the Worker packages

- **Status:** deferred. Logged 2026-10-11 (session 2, proposed for product-owner review).
- **What:** `apps/events` and `apps/scanner` pin `vitest@4.1.11`, while the rest of the repo uses Vitest 5,
  because `@cloudflare/vitest-pool-workers` 0.22 supports only Vitest 4. They also pin `wrangler@4.124.0`,
  the version that pool bundles, so the tree holds one wrangler and one `workerd`. The Workers'
  `compatibility_date` (2026-08-15) is capped by that `workerd`.
- **Revisit when** the Workers pool supports Vitest 5: move both packages to the repo's Vitest and a
  current wrangler, and bump the compatibility date.

## TD-3: Duplicated Worker helpers

- **Status:** deferred. Logged 2026-10-11 (session 2, proposed).
- **What:** the origin allowlist matcher (`src/origins.ts`) is copied in `apps/events` and
  `apps/scanner`. The scanner's retention periods also appear twice: as Worker vars and as
  `SCANNER_RETENTION` in the web copy.
- **Revisit when** a third Worker appears: extract a small framework-free `packages/worker-kit`, and have
  the scanner report its retention periods so the web copy can read them.

## TD-4: Scanner subresource DNS

- **Status:** deferred. Logged 2026-10-11 (session 2, proposed).
- **What:** the submitted hostname is resolved over DNS-over-HTTPS and refused if it points anywhere
  private. The page's own subresources are checked by hostname only (no IP literals, internal names or
  odd ports), because Browser Run's browser does its own DNS. A public name that resolves to a private
  address could still be requested as a subresource. That's bounded: the browser runs on Cloudflare's
  network, not ours.
- **Options:** Browser Run session `guardrails` (`allowedDomains`: the target host plus the
  `common-cdns` set), at the cost of incomplete rendering on sites with other third-party CSS; or
  resolving subresource hosts in the route handler, at the cost of latency.

## TD-5: Scanner heuristics and live verification

- **Status:** deferred. Logged 2026-10-11 (session 2, proposed).
- **What:** rubric v1 (`docs/scanner-rubric.md`) is calibrated on four pages. Several checks are
  heuristics:
  - hover-only reveals: CSS only
  - carousels: class-name candidates plus mutation bursts
  - forced colors: the presence of rules or queries
  - dark mode: background luminance

  The Browser Run path has not run live: the build sandbox couldn't reach Cloudflare or public sites.
- **Revisit:** right after the first deploy, scan the deployed `/demo` and a few known sites and compare
  with calibration. Before publishing scores widely, build a small labeled corpus and tune `THRESHOLDS`
  under a new `RUBRIC_VERSION`.

## TD-6: Report pages render client-side

- **Status:** deferred. Logged 2026-10-11 (session 2, proposed).
- **What:** `/listen/report/[id]` fetches the report in the browser, so shared links get generic
  metadata (no score in link previews) and the page needs JavaScript.
- **Revisit when** sharing matters for acquisition: fetch on the server with a short revalidate and
  generate an Open Graph image from the score.
