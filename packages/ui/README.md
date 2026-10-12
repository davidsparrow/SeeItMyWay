# @simw/ui

Shared React controls for SeeItMyWay surfaces: the web app today, the Passport extension later.

Components use Tailwind utility classes against semantic color tokens, so each consuming app
defines what the tokens look like (and how they change with `data-simw-*` attributes):

| Token class      | Meaning                   |
| ---------------- | ------------------------- |
| `bg-surface`     | card / control background |
| `bg-surface-2`   | recessed background       |
| `text-ink`       | primary text              |
| `text-muted`     | secondary text            |
| `border-line`    | hairlines                 |
| `bg-accent`      | primary action            |
| `text-on-accent` | text on the accent        |
| `bg-accent-soft` | selected/hover tint       |

Consuming apps must add this package to Tailwind's sources, e.g. `@source "../../packages/ui/src";`.
