# Preference Awareness Score: rubric v2

The Site Listener Test (`apps/scanner`, logic in `packages/scanner-core`) loads one public page five
times, each in a fresh browser context with one visitor preference emulated from the first paint:

| Variant          | Emulated                                                    |
| ---------------- | ----------------------------------------------------------- |
| `baseline`       | light, no motion preference, no contrast preference         |
| `reduced-motion` | `prefers-reduced-motion: reduce`                            |
| `dark`           | `prefers-color-scheme: dark`                                |
| `more-contrast`  | `prefers-contrast: more`                                    |
| `forced-colors`  | `forced-colors: active`                                     |

In each load, after `load` plus 1.5 s of quiet, the in-page collector records:

- CSSOM rules mentioning each `prefers-*` / `forced-colors` feature
  (cross-origin sheets are counted from their response text)
- motion the page's CSS can make: `@keyframes` rules and `scroll-behavior: smooth` declarations
  (cross-origin sheets counted from their text too)
- `matchMedia()` queries made by the page's scripts
- the effective page background and text colors, and color signatures for up to 400 visible elements
- for those elements that hold their own text, the WCAG contrast ratio against what's really behind
  them: semi-transparent backgrounds are composited up to the first opaque one (or the canvas), and
  text over a background image or gradient counts as below 7:1, since we can't know its colors
- running and infinite animations (`document.getAnimations()`)
- `<video>` / `<audio>` state
- `:hover`-only reveal rules
- the viewport meta tag
- in `baseline` and `reduced-motion`, 6 s of watching carousel-like elements for movement nobody asked for

`analyze()` turns those facts into ten checks. It's deterministic: the same facts always give the same
result. A **pass** (✓) earns the check's full weight, a **partial** (△) half of it (rounded down), a
**fail** (✕) nothing. The score is the sum, out of 100.

**Not applicable counts as a pass (v2).** A page with nothing to adapt shouldn't lose points for not
adapting it, but only positive evidence earns that. Any doubt, such as an unreadable stylesheet, a
background image behind text or too few text samples, keeps the stricter result.

- **No motion:** no animation running when we collected, no `@keyframes` or smooth-scroll rule in
  any stylesheet, no visible video playing or set to autoplay, no carousel moving, and every
  stylesheet read. Then `reduced-motion-listens` passes as "No motion to reduce".
- **Already high contrast:** at least 5 text samples, all at 7:1 (WCAG enhanced) or above. Then
  `contrast` passes as "Already high contrast".

| Check                      | Weight | ✓ pass                                                                                     | △ partial                                                                                       | ✕ fail                                                     |
| -------------------------- | -----: | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `color-scheme`             |     20 | baseline background luminance > 0.4 **and** dark background < 0.2 ("Dark mode respected") | baseline already ≤ 0.2 ("Dark by default"), or ≥ 25 % of sampled elements change, or any color-scheme rule, query, `light-dark()` or declared `color-scheme: dark` | nothing changes and no evidence                            |
| `contrast`                 |     15 | ≥ 2 % of sampled elements change, or the text/background contrast ratio gains ≥ 0.5, or (v2) every text sample already ≥ 7:1 | a `prefers-contrast` rule or query, but nothing changed                                         | nothing changes and no evidence                            |
| `reduced-motion-listens`   |     10 | any `prefers-reduced-motion` CSS rule or script query, or (v2) no motion at all            | –                                                                                               | none found, and the page can move                          |
| `reduced-motion-animation` |     10 | no infinite animation under reduced motion (or none at all)                                | fewer infinite animations than baseline, but some remain                                        | as many as baseline                                        |
| `reduced-motion-media`     |      8 | no visible `<video>` set to autoplay or playing under reduced motion                        | –                                                                                               | one remains ("Hero video…" when it covers ≥ 15 % of the first viewport) |
| `carousel`                 |      7 | no movement under reduced motion                                                           | –                                                                                               | a carousel moved on its own under reduced motion           |
| `forced-colors`            |     10 | any `forced-colors` CSS rule or script query                                               | none found (browsers apply forced colors automatically; check by hand)                         | –                                                          |
| `hover`                    |     10 | no hover-only reveal rule                                                                  | `:hover` rules that reveal another element with no `:focus` / `:focus-within` / `:focus-visible` twin, outside `(hover: hover)` (labeled **possible**) | –                                                          |
| `viewport`                 |      5 | `<meta name="viewport">` with `width=device-width` ("Touch layout responsive")             | –                                                                                               | missing                                                    |
| `audio-autoplay`           |      5 | no media autoplaying or playing with sound in the baseline                                 | some ("Sound may start on its own"); softer than the motion findings, per decision 7            | –                                                          |

The thresholds live in `THRESHOLDS` in `packages/scanner-core/src/analyze.ts`. Change them, a weight or
a check only together with `RUBRIC_VERSION`, and re-run the calibration specs.

## Calibration

`tests/e2e/specs/scanner.spec.ts` runs the real driver and rubric in local Chromium:

| Page                                          | Expected                                                                                  | Score |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- | ----: |
| `apps/demo-sites/plain.html` (no SDK)         | fails reduced motion (listening, animation, hero video), dark mode and contrast            |    32 |
| `apps/demo-sites/still.html`                  | nothing moves and all text is ≥ 7:1, so motion listening and contrast are not applicable; no dark mode |    75 |
| `apps/demo-sites/index.html` (SDK via npm)    | passes motion, theme, contrast and forced colors                                           |  ≥ 90 |
| `apps/demo-sites/script-tag.html` (SDK tag)   | same                                                                                      |  ≥ 90 |
| Northlight (`/demo`)                          | hears motion, theme and contrast; its carousel advances, but not under reduced motion      |  ≥ 80 |

## Changes

- **v2 (2026-10-12):** "not applicable" passes for pages with no motion at all and pages whose text
  is already at 7:1. Prompted by the first live scans (`docs/tech-debt.md`, TD-5): example.com, which
  has no motion and black-on-white text, lost 25 points under v1 for not adapting either. It scores
  95 under v2. The other live pages and the calibration fixtures kept their v1 scores.
- **v1 (2026-10-11):** first rubric.

## What this is not

A limited automated check of one page. It isn't an accessibility audit, doesn't claim compliance with
anything (PRD §26), and can be fooled: a site can listen in ways a single page load doesn't show.
