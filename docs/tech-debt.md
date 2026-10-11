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
