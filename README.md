# SeeItMyWay

Everyone’s different, why is your homepage the same for everyone?

**The preference layer for the web.** Websites that adapt to how visitors like the web, without needing
to know who they are. Personalization without profiling.

- Product docs: [`Seeitmyway-PRD`](./Seeitmyway-PRD) and [`Seeitmyway-PRD-prefix+addendum`](./Seeitmyway-PRD-prefix+addendum)
- Working agreement for AI agents and humans: [`CLAUDE.md`](./CLAUDE.md)

## What's built (V0A + V0B)

| Route         | What it is                                                                                                             | PRD           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------- |
| `/`           | **Browser Checkup**: "What does your browser tell websites?" Live reveal, demos, how-to-change, Check Again, wish list | A.1–A.7, D, F |
| `/playground` | **Preference Playground**: preview native and SeeItMyWay preferences on one site, without touching device settings     | A.6           |
| `/passport`   | **Passport builder**: a local profile, live preview, exact shared packet, "My Web Wants" card, extension upsell        | A.8, A.9, E   |
| `/demo`       | **Northlight**, an adaptive demo site with a "Tune this site" panel and anonymous experience seed                      | V0B, §18–20   |
| `/listen`     | Site-owner entry point ("Does your website listen?"). The scanner itself is V0C, not built yet                         | B.1           |
| `/privacy`    | The SeeItMyWay Promise, the exact list of anonymous events, and everything stored on this device                       | §27, §29      |

The site runs the SDK on itself: theme, motion, contrast, transparency, density and text size all come
from the visitor's device and saved Passport.

## Repository layout

```text
apps/
  web/          Next.js 16 app (marketing, Checkup, Playground, Passport, demo) → Vercel
  demo-sites/   Plain-HTML fixtures retrofitted with the SDK (npm and <script> tag) → proves framework independence
  scanner/      Planned: Site Listener Test on Cloudflare Workers + Browser Run (V0C)
  extension/    Planned: Passport browser extension, WXT + React (V1.5)
packages/
  protocol/     SIMW vocabulary, coarse values, sharing classes, packet + JSON Schema, precedence resolver
  detector/     Reads native browser/OS signals; preference vs device characteristic; platform detection
  adapters/     Experience → data-simw-* attributes + --simw-* tokens; policies; Level 1 safe adaptations
  sdk/          The website runtime (vanilla TS, script-tag IIFE build, optional React bindings)
  privacy/      What may be shared, what may go on a card, what may be counted (closed allowlist)
  types/        Shared shapes: native signals, platforms, storage
  ui/           Shared React controls (web now, extension later)
tooling/
  tsconfig/     Shared TypeScript configs
```

Dependency direction is strictly downward: `types ← protocol ← privacy / adapters`, `types ← detector`,
and `sdk` composes them. Nothing under `packages/` imports from `apps/`, and nothing except `ui` and
`sdk/react` knows React exists.

## Getting started

Requires Node 22.12+ and pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm dev                              # web app on http://localhost:3000
pnpm --filter @simw/demo-sites dev    # retrofit fixtures on http://localhost:5174
pnpm check                            # Biome format/lint + typecheck + unit tests, every package
pnpm build                            # build everything (SDK bundles, Next app, fixtures)
pnpm test:e2e                         # browser-test invariants against the built output (Playwright)
pnpm lint:fix                         # apply Biome's safe fixes and formatting
```

Configuration is optional and env-driven (`apps/web/.env.example`, `apps/web/src/lib/config.ts`):
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SDK_URL`, `NEXT_PUBLIC_EVENTS_URL`, `NEXT_PUBLIC_SCANNER_URL`.
Nothing hard-codes a hostname; protocol identity stays `urn:simw:protocol:0.1`.

### Quality gates

CI (`.github/workflows/ci.yml`) runs, in order: `pnpm install --frozen-lockfile`, `biome ci .`,
typecheck, unit tests, build, then the browser-test invariants. A broken invariant fails CI by name:

| ID    | Promise                                                                                           | Spec                              |
| ----- | ------------------------------------------------------------------------------------------------- | --------------------------------- |
| INV-1 | A live OS preference change is detected, and the Checkup updates and celebrates without a refresh | `tests/e2e/specs/checkup.spec.ts` |
| INV-2 | A stored dark Passport paints dark first on a light device, with no light flash                   | `tests/e2e/specs/passport.spec.ts` |
| INV-3 | The plain-HTML SDK suppresses autoplaying visual motion under reduced motion                      | `tests/e2e/specs/sdk.spec.ts`     |

## The core idea in code

```ts
import { createSeeItMyWay } from '@simw/sdk';

createSeeItMyWay({ site: 'example.com' }).start();
// <html data-simw-motion="reduced" data-simw-color-scheme="dark" data-simw-density="roomy" …>
```

Sites style against `data-simw-*` attributes and `--simw-*` tokens rather than raw media queries. The
same CSS then serves native signals, Passport preferences, local Tune overrides and preview simulations,
because they all resolve to one effective `Experience` first, in this order (PRD §20):

1. **Your device**: accessibility / browser / OS requirements. They decide what happens on this device
   (reduced motion, forced colors, saving data) without rewriting anything the visitor saved.
2. **Set on this site**: the visitor's local Tune overrides.
3. **Your Passport**: portable preferences.
4. **Site design**: the owner's defaults.
5. **Random variation**: anonymous, decoration only, switched off when it could fight a contrast request.

Resolution keeps two layers apart: what the visitor **stated** (layers 2–4, stored exactly as chosen) and
the **effective** experience after device constraints. A Passport saying "Full motion" stays "Full" on a
phone that asks for reduced motion; that phone just gets calm motion, and the UI says why.

## Deployment

- **Web (Vercel): deploy-ready, not deployed yet** (no Vercel credentials were available to the build
  session). Steps, env vars and the CLI path are in [`docs/deploy/vercel.md`](./docs/deploy/vercel.md):
  Root Directory `apps/web`, Node 22, and `apps/web/vercel.json` builds through Turborepo so the SDK is
  bundled first. Production will be a standard `seeitmyway.vercel.app`-style URL.
- **Scanner (Cloudflare):** planned, see [`apps/scanner/README.md`](./apps/scanner/README.md).

## Status and known gaps

- **Anonymous counting is stubbed.** Events go through the allowlist in `@simw/privacy` but stay in the
  browser (`/privacy` shows them). Connect a backend by calling `setEventSink()` in `apps/web/src/lib/telemetry.ts`.
- **Some "Show me how" steps need vendor review before launch.** See
  [`docs/instructions-review.md`](./docs/instructions-review.md).
- The SDK isn't published to npm or a CDN yet. The `/listen` snippet loads the script-tag build that
  the web app serves itself (`/sdk/simw.global.js`); `NEXT_PUBLIC_SDK_URL` can point it at a CDN later.
- **TypeScript is pinned to 5.9 for V0** (TS 7 drops the compiler API Next.js uses). See
  [`docs/tech-debt.md`](./docs/tech-debt.md) TD-1.
- V0C (Site Listener Test) and the open protocol spec are next; the Passport extension comes later.
  The plan for the next session is in [`docs/handoff/session-02.md`](./docs/handoff/session-02.md).
