# Deploying `apps/web` to Vercel

Status: **deployed.** The project was set up in the Vercel dashboard as below, and production deploys
from `main` through Vercel's Git integration. The Workers aren't deployed yet, so counting stays on the
device and `/listen` shows "coming soon" until `NEXT_PUBLIC_EVENTS_URL` and `NEXT_PUBLIC_SCANNER_URL` are
set.

Production is a standard `<project>.vercel.app` URL. No custom domain yet; adding one later is a
config change (`NEXT_PUBLIC_SITE_URL`), not a code change.

## One-time project setup (dashboard)

1. **Add New → Project → Import Git Repository** → `davidsparrow/SeeItMyWay`. Vercel says **"Multiple
   applications detected"** because it finds `apps/web` (Next.js) and `apps/demo-sites` (Vite). Choose
   **import as a standalone project** and import only `apps/web`; don't group them with Services.
   `apps/demo-sites` is a fixture the browser tests run locally (INV-3) and is never deployed.
2. **Project name:** `see-it-my-way`. That `vercel.app` name was taken, so production is
   `https://see-it-my-way-navy.vercel.app` until a custom domain replaces it. Passport, Tune settings,
   seeds and Checkup history live in `localStorage`, which is per origin, so moving to the domain starts
   every visitor fresh: switch before sharing the site widely.
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

- **Preview deployments are separate origins**, each with its own `localStorage`. Vercel shortens the
  project name in them: deployments are `see-it-my-<hash>-davids-projects-e32e946e.vercel.app` and
  branch aliases `see-it-my-way-git-<branch>-davids-projects-e32e946e.vercel.app`
  (`davids-projects-e32e946e` is the team slug). One pattern covers both, so the Workers' CORS
  allowlists are
  `ALLOWED_ORIGINS=https://see-it-my-way-navy.vercel.app,https://see-it-my-*-davids-projects-e32e946e.vercel.app`.
- On previews, `NEXT_PUBLIC_SITE_URL` still resolves to the production URL (that's what
  `VERCEL_PROJECT_PRODUCTION_URL` holds), so `metadataBase`, share text and the `/listen` snippet point
  at production. That's intended: they're for sharing.
- `vercel.app` is on the Public Suffix List. Irrelevant here: SeeItMyWay sets no cookies.
- Turborepo runs in strict env mode. `NEXT_PUBLIC_*` is inferred for Next.js and
  `VERCEL_PROJECT_PRODUCTION_URL` is declared in `apps/web/turbo.json`; declare any new build-time
  variable there too, or Turborepo filters it out.

## Deploy from the CLI (when a token is available)

Needs three secrets in the environment (in a Claude Code cloud session: the environment's settings, as
environment variables): `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`. `VERCEL_ORG_ID` is the
team ID (`team_…`, Team Settings → General); `VERCEL_PROJECT_ID` is in the project's Settings → General.
Both are also in `.vercel/project.json` after `vercel link`. [`.env.example`](../../.env.example) lists
every environment variable and where it goes.

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
BASE_URL=https://see-it-my-way-navy.vercel.app pnpm test:e2e
```
