# AGENTS.md — `src/styles/`

Global styles for the Atelier Study redesign. Imported once from `main.jsx` in this order: `tokens.css`, `base.css`, `primitives.css`.

## Files

| File | Purpose |
|---|---|
| `tokens.css` | Colour, font, spacing, radius, size and opacity variables. Three themes on `<html data-theme>`: `light` (Porcelain), `sepia` (Parchment), `dark` (Midnight). |
| `base.css` | Reset, body type, heading scale, `as-display / as-headline / as-title / as-score / as-question / as-body / as-small / as-label / as-control` type classes, `as-visually-hidden`, plain app shell, spinner. |
| `primitives.css` | Shared `as-` primitives: `as-btn`, `as-field`, `as-alert`, `as-tabs` / `as-tab`, `as-tag`. Add one here only when a second page needs it. |

## Rules

- Never hard-code a colour in a page stylesheet: read the variables from `tokens.css`. A page stylesheet carries no `[data-theme]` selectors (lightningcss strips them when they share a class with a base rule; see `../../../.cursor/rules/light-dark-mode-text-contrast.mdc`). Theme values are assigned only in `tokens.css`, on the `<html>` selectors.
- Theme ids live in three places: `tokens.css`, `ThemeContext.jsx` (`THEMES`) and the inline script in `index.html`. Change them together.
- Serif (Cormorant Garamond) is for titles and scores only, never below 24px, never for questions, passages or answers. Everything learners read or click is Lexend, in sentence case.
- Controls and answer choices are at least `--size-touch` (48px) tall. Radius is `--radius-sm` (2px) on controls and `--radius-md` (4px) on cards and dialogs. Nothing is a pill.
- A result is never colour alone: pair `--correct` / `--rust` with an icon and a word (see `as-alert`).
- The designs live on the Project Pages canvas; build each page from its board, keeping the real copy and behaviour.
