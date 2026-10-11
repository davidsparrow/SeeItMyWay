# CLAUDE.md

Working agreement for anyone (human or AI agent) changing this repo.

## Mental model

Everything is TypeScript. React where UI is needed. Next.js for the web product. Vanilla TypeScript for
anything that leaves our product (the SDK, the protocol, the detector). Workers for heavy remote jobs.

The product is the **preference layer for the web**: visitors express preferences, websites listen. The
crown jewels are `packages/protocol`, `packages/detector`, `packages/sdk` and `packages/adapters`. The
Next.js app is just one consumer of them.

## Commands

```bash
pnpm install
pnpm check                         # typecheck + tests, all packages (run before every commit)
pnpm build                         # everything
pnpm dev                           # apps/web on :3000
pnpm --filter @simw/<name> test    # one package
```

## Boundaries (don't break these)

- `packages/*` never import from `apps/*`.
- Only `packages/ui` and `packages/sdk/src/react.tsx` may import React. `sdk`, `protocol`, `detector`,
  `adapters`, `privacy` and `types` must stay framework-free; the SDK ships as a `<script>` tag.
- Internal packages export TypeScript source (`exports: "./src/index.ts"`); Next compiles them via
  `transpilePackages`. Only `@simw/sdk` has a build step (tsup → ESM + IIFE).
- New preference values go in `packages/protocol/src/vocabulary.ts` and nowhere else. Keep it coarse:
  named buckets, never numbers (PRD §15). The PRD wants 8–15 universal preferences, not more.
- TypeScript stays at `~5.9.3` for V0. Don't upgrade to TS 7 or add a second compiler; see
  `docs/tech-debt.md` TD-1. Log any new deliberate deferral there too.

## Product rules encoded in code

- **Personalize behavior, not identity** (PRD §4). Never infer anything about a person from a preference.
  Copy says what the browser says, never why someone might want it.
- **Preference ≠ device characteristic.** Touch, hover and screen gamut are `nature: 'environment'` and
  are never described, shared or put on a result card as preferences.
- **Native accessibility signals are floors** in `resolveExperience`: an OS "reduce motion" can't be
  loosened by a Passport or Tune setting. Color scheme is a default that explicit choices may override.
- **Fail closed** (PRD §21): safe adapters uninstall themselves on error. The original site wins.
- **Counting** goes only through `track()` → `sanitizeEvent()`. Every property is a closed enum or a
  small bounded integer. No free text, URLs, IDs or timestamps. Add new events to `ANONYMOUS_EVENTS` in
  `packages/privacy/src/events.ts` and describe them on `/privacy`.
- **Never claim accessibility compliance** (PRD §26). SeeItMyWay helps sites respect preferences; it
  doesn't make them accessible.

## Styling

- The web app styles itself from `data-simw-*` attributes on `<html>` (set by the SDK and by the inline
  boot script before first paint), never from raw `@media (prefers-*)` queries, except as a no-JS fallback.
- Tailwind v4 spacing (`--spacing`) scales with `--simw-spacing-scale`, and `html` font size with
  `--simw-font-scale`, so density and text size preferences apply site-wide automatically.
- Animations must respect `data-simw-motion`: `full` may move, `reduced` fades, `minimal` doesn't move.
  Preview containers that must show motion on request carry `data-simw-essential-motion`.
- Northlight (`apps/web/src/northlight`) is scoped CSS under `.nl`, keyed off attributes on its own root,
  so it can render any simulated experience next to the real one.

## Content

- "Show me how" steps live in `apps/web/src/content/instructions.ts`, each marked `verified: 'mdn'` or
  `'needs-review'`. Don't mark anything verified without checking a primary source.
- Avoid unbacked statistics in copy ("99% of people don't know…"). Use defensible phrasing.
