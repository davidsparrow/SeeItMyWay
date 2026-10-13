# "Show me how" instructions: review before launch

`apps/web/src/content/instructions.ts` holds the platform-specific steps shown when a visitor asks how to
change a setting (PRD A.5). Wrong steps would undercut the whole product, so every entry records how it
was verified, and every verified entry names its source (a unit test enforces that).

## Verified against MDN (mdn/content, October 2026)

| Topic        | Platforms                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Motion       | iPhone, iPad, Mac (Tahoe and Sequoia paths), Windows 11 and 10, Android, GNOME, KDE, Firefox `about:config` |
| Transparency | Windows, Mac, iPhone, iPad                                                                                  |

Browser support notes (e.g. "Safari doesn't pass on reduced transparency") were checked against
mdn/browser-compat-data.

## Verified against vendor help pages (October 2026, session 3)

Checked against Apple, Microsoft, Google, Mozilla and GNOME help pages. Where those are silent, the
vendor's own source code (Chromium, WebKit, Firefox) filled the gap. Each entry's `source` is the page
that confirms its path. support.mozilla.org answers automated fetches with a bot challenge, so the
Firefox articles were read from their latest Wayback Machine copies (May–July 2026) and every label was
cross-checked against Firefox's own strings (`browser/locales/en-US/browser/preferences/preferences.ftl`
on the `release` branch).

| Topic           | Platforms                                                    | Changes made                                                                                              |
| --------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Appearance      | iPhone, iPad, Mac, Windows, Android, GNOME, Chrome           | iOS/iPadOS 27 renamed Display & Brightness to **Appearance** (older path kept as an alternative). Pixel path added. Windows path is the same on 10 and 11. Chrome note: since Chrome 136 its Mode setting reaches websites, except in Incognito |
| Contrast        | Mac, iPhone, iPad, Windows                                   | Unchanged (Increase contrast stayed under Display on macOS 26 and 27). "Replaces most website colors"     |
| Forced colors   | Windows 11 and 10                                            | Windows 10 alternative now says how to turn it on (a toggle, not "apply")                                |
| Inverted colors | iPhone, Mac                                                  | iPhone now points to **Classic Invert**: WebKit answers `inverted-colors` from `UIAccessibilityIsInvertColorsEnabled()`, which Apple documents as the Classic Invert setting, so Smart Invert isn't visible to websites |
| Text size       | Chrome, Edge, Safari                                         | Safari path ends at "When visiting other websites". Its note no longer says zoom looks like "a bigger screen": a zoomed page sees a smaller window |
| Data saver      | Android (Pixel's help page)                                  | Note says when Chrome passes it on: mobile data or another metered connection, never in Incognito (Chrome 102+) |
| Firefox (all four) | Website appearance, contrast/forced colors, text size, Global Privacy Control | All moved in **Firefox 152's Settings redesign**; the older paths are kept as alternatives (ESR 140 still uses them). "Automatic" is now "System". The ≤137 "Override the colors specified by the page" dropdown is gone: Custom in Website contrast forces colors now |

Sources for the browser-behavior notes:

- Chrome Mode → `prefers-color-scheme`: Chromium change 6096298 (crbug 332328864), launched by change
  6387064, stable in Chrome 136; `chrome/browser/chrome_content_browser_client.cc` ("Incognito contents
  follow the device color mode by default").
- Save-Data on Android: Chromium change 3573287 (Chrome 102) and `chrome/browser/data_saver/data_saver.h`
  ("Android Data Saver option is enabled and the device is on a metered network").
- Inverted colors: `Source/WebCore/platform/ios/PlatformScreenIOS.mm` (WebKit) and Apple's
  `UIAccessibility.isInvertColorsEnabled` documentation.
- Firefox Custom contrast → `forced-colors: active`: Firefox's source docs
  (firefox-source-docs.mozilla.org/accessible/HCMMediaQueries.html: "the `active` state is triggered when
  a user has enabled Windows High Contrast Mode or Firefox High Contrast Mode"). Website appearance writes
  `layout.css.prefers-color-scheme.content-override`.
- Windows contrast themes and forced colors: MDN's `forced-colors` page and Chromium's
  `ui/native_theme/os_settings_provider_win.cc`. Built-in contrast themes usually also match
  `prefers-contrast: more` (ratio ≥ 7:1); edited themes may match `custom` or `less`.

## Still open

- **Gaps:** no ChromeOS steps for any topic yet.
- **Android Data Saver** is verified against Pixel's help page only (Google's generic Android page is
  gone). Other manufacturers may label it differently.
- **Mac inverted colors:** macOS has an Invert colors mode (Smart or Classic). WebKit on Mac reads
  `accessibilityDisplayShouldInvertColors`; whether that covers both modes isn't documented.

Every instruction panel also tells visitors what to search for in Settings if menus have moved.
