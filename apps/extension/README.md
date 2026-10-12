# apps/extension (planned, V1.5)

The **SeeItMyWay Passport** browser extension (PRD §13–17, A.9). Free, permanently.

## Plan

- **Stack:** WXT + React + TypeScript (Manifest V3; Chrome first, then Firefox, Edge and Safari via WXT).
- **Stores** the visitor's preferences in extension storage (optionally synced).
- **Preference Bridge:** participating sites ask through the SDK; the extension answers only with a
  standardized packet (`@simw/protocol` `PreferencePacket`, filtered by `@simw/privacy`
  `filterForSharing`). Websites can never read arbitrary extension storage, browsing history or the list
  of sites a visitor uses.
- **Per-site sharing toggles** and overrides; an indicator: "✨ This site understands SeeItMyWay".
- The SDK already accepts any `PassportSource` (`packages/sdk/src/passport.ts`); the bridge implements it.

Prototype the bridge before committing to a protocol: Chrome's cross-origin and extension messaging rules
should shape it (PRD §17).

## Will consume

`@simw/protocol`, `@simw/privacy`, `@simw/ui`, `@simw/types`.
