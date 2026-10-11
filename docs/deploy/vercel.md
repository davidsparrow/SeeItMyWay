# Deploying `apps/web` to Vercel

Status: **deploy-ready, not deployed.** No Vercel credentials were available to the build session
(see "Deploy from the CLI" for what's needed). Everything below has been checked locally: the exact
build command, the env-driven config and the browser-test invariants.

Production is a standard `<project>.vercel.app` URL. No custom domain yet; adding one later is a
config change (`NEXT_PUBLIC_SITE_URL`), not a code change.

## One-time project setup (dashboard)

1. **Add New → Project → Import Git Repository** → `davidsparrow/SeeItMyWay`.
2. **Project name:** `seeitmyway`. The production URL becomes `https://seeitmyway.vercel.app` if the
   name is free. Pick the name carefully and keep it: Passport, Tune settings, seeds and Checkup history
   live in `localStorage`, which is per origin, so a new URL starts every visitor fresh.
3. **Framework preset:** Next.js (detected).
4. **Root Directory:** `apps/web`. Leave **"Include files outside of the Root Directory in the Build
   Step"** enabled (Settings → Build and Deployment → Root Directory); the build needs the workspace
   packages.
5. **Build and install commands:** leave the defaults. `apps/web/vercel.json` sets the one thing Vercel
   can't infer: the build command `cd ../.. && pnpm exec turbo run build --filter=@simw/web`, so the
   SDK is built and copied to `/sdk/simw.global.js` before `next build`. Vercel detects pnpm 10 from
   `packageManager` and installs the whole workspace from the repo root.
6. **Node.js version:** 22.x (Settings → Build and Deployment → Node.js Version).
7. **Environment variables** (Settings → Environment Variables). All optional:

   | Name                      | Environments        | Value                                                     |
   | ------------------------- | ------------------- | --------------------------------------------------------- |
   | `NEXT_PUBLIC_SITE_URL`    | Production          | Leave unset: it falls back to `https://$VERCEL_PROJECT_PRODUCTION_URL`. Set it once a domain exists. |
   | `NEXT_PUBLIC_SDK_URL`     | All                 | Leave unset: the app serves `/sdk/simw.global.js` itself. |
   | `NEXT_PUBLIC_EVENTS_URL`  | Production, Preview | The events Worker URL once deployed (`apps/events/README.md`). Unset = counting stays on the device. |
   | `NEXT_PUBLIC_SCANNER_URL` | Production, Preview | The scanner Worker URL once deployed (`apps/scanner/README.md`). Unset = `/listen` shows "coming soon". |
   | `NEXT_TELEMETRY_DISABLED` | All                 | `1` (optional: Next.js's own build telemetry)              |

   `NEXT_PUBLIC_*` values are inlined at build time: redeploy after changing one.
8. **Deploy.** Every push to `main` then deploys production; every other branch and PR gets a preview.

Optional: set **Ignored Build Step** to `npx turbo-ignore@2` to skip deploys when nothing `apps/web`
depends on changed.

## Things to know

- **Preview deployments are separate origins** (`seeitmyway-<hash>-<team>.vercel.app`), each with its own
  `localStorage`. The Workers' CORS allowlists must include the preview pattern, e.g.
  `ALLOWED_ORIGINS=https://seeitmyway.vercel.app,https://seeitmyway-*-<team>.vercel.app`.
- On previews, `NEXT_PUBLIC_SITE_URL` still resolves to the production URL (that's what
  `VERCEL_PROJECT_PRODUCTION_URL` holds), so `metadataBase`, share text and the `/listen` snippet point
  at production. That's intended: they're for sharing.
- `vercel.app` is on the Public Suffix List. Irrelevant here: SeeItMyWay sets no cookies.
- Turborepo runs in strict env mode. `NEXT_PUBLIC_*` is inferred for Next.js and
  `VERCEL_PROJECT_PRODUCTION_URL` is declared in `apps/web/turbo.json`; declare any new build-time
  variable there too, or Turborepo filters it out.

## Deploy from the CLI (when a token is available)

Needs three secrets in the environment (in a Claude Code cloud session: the environment's settings, as
environment variables): `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (the last two are in
the project's Settings → General, or in `.vercel/project.json` after `vercel link`).

From the repo root:

```bash
pnpm dlx vercel@62.0.0 pull --yes --environment=production --token="$VERCEL_TOKEN"
pnpm dlx vercel@62.0.0 build --prod --token="$VERCEL_TOKEN"
pnpm dlx vercel@62.0.0 deploy --prebuilt --prod --token="$VERCEL_TOKEN"
```

## Smoke test a deployment

The browser-test invariants accept a deployed origin. INV-1 and INV-2 then run against it; INV-3
always uses the local demo-sites fixture.

```bash
pnpm build
BASE_URL=https://seeitmyway.vercel.app pnpm test:e2e
```
