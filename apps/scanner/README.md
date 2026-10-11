# apps/scanner (planned, V0C)

The **Site Listener Test**: "Does your website listen?" (PRD Addendum B, §11–12).

## Plan

- **Runtime:** TypeScript on Cloudflare Workers, driving headless Chromium through Cloudflare Browser Run
  (Playwright/CDP). Browser automation is infrastructure, so it lives here, not inside the Next.js app.
- **First version (limited audit):**
  1. Load the page normally, then again with emulated `prefers-reduced-motion`, `prefers-color-scheme: dark`,
     `prefers-contrast: more` and `forced-colors: active`.
  2. Compare computed styles and screenshots between runs: does anything actually change?
  3. Detect autoplay media, auto-advancing carousels, infinite CSS animations, parallax and hover-only
     content.
  4. Produce a Preference Awareness Score and the ✓ / △ / ✕ report shown on `/listen`.
- **Later:** crawl, template clustering (§12), component detection, Adaptive Site Map (§7), change
  monitoring (§21).

## Will consume

- `@simw/protocol` for the vocabulary and report types
- `@simw/detector` for the media-feature catalog
- `@simw/adapters` to preview Level 1 safe adaptations on the scanned page

Only public pages are loaded; nothing behind a login is ever scanned.
