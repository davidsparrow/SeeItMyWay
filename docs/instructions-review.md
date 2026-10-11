# "Show me how" instructions: review before launch

`apps/web/src/content/instructions.ts` holds the platform-specific steps shown when a visitor asks how to
change a setting (PRD A.5). Wrong steps would undercut the whole product, so every entry records how it
was verified.

## Verified against MDN (mdn/content, October 2026)

| Topic        | Platforms                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Motion       | iPhone, iPad, Mac (Tahoe and Sequoia paths), Windows 11 and 10, Android, GNOME, KDE, Firefox `about:config` |
| Transparency | Windows, Mac, iPhone, iPad                                                                                  |

Browser support notes (e.g. "Safari doesn't pass on reduced transparency") were checked against
mdn/browser-compat-data.

## Needs review against vendor help pages

Vendor help sites (Apple, Microsoft, Google, Mozilla) weren't reachable from the build environment. Check
these, then change `verified` to a source:

- **Appearance:** iPhone/iPad, Mac, Windows 11, Android, GNOME, Firefox "Website appearance", Chrome
  Settings → Appearance → Mode (confirm it changes `prefers-color-scheme` for web pages).
- **Contrast:** Mac, iPhone/iPad, Windows 11 contrast themes.
- **Forced colors:** Windows 11/10, Firefox "Manage Colors".
- **Inverted colors:** iPhone, Mac.
- **Text size:** Chrome, Edge, Firefox, Safari (no default size setting).
- **Data saver:** Android Data Saver (and whether Chrome on Android sends `Save-Data` for it).
- **Global Privacy Control:** Firefox path.
- **Gaps:** no ChromeOS steps for any topic yet.

Every instruction panel also tells visitors what to search for in Settings if menus have moved.
