# AGENTS.md

## Project

This is a private Vite React app using JavaScript, React Router, and plain CSS. The frontend lives in `src/`; built output goes to `dist/`.

## Commands

- Install dependencies: `npm install`
- Start local dev server: `npm run dev`
- Start dev server against production API: `npm run dev:prod`
- Build: `npm run build`
- Lint: `npm run lint`
- Preview production build: `npm run preview`

## Structure

- `src/App.jsx` wires providers, hash-based routes, lazy-loaded pages, and route guards.
- `src/pages/` contains route-level screens and their matching CSS files.
- `src/components/` contains shared UI, navigation, route guards, modals, and spinners.
- `src/AuthContext.jsx`, `src/DriveContext.jsx`, and `src/ThemeContext.jsx` own app-level state.
- `src/config.js` defines API selection, allowed upload types, and max upload size.
- `UI/` contains design/reference variants; do not treat it as the active app unless a task specifically asks for it.

## Editing Guidance

- Follow the existing React function component style and keep imports relative.
- Keep page-specific styles in the matching page CSS file when possible; keep shared styles in component CSS or app/global CSS as appropriate.
- Prefer small, scoped changes over broad refactors. Do not reorganize routes, providers, or contexts unless the task requires it.
- Preserve the hash router behavior and the OAuth callback flow in `src/App.jsx`.
- Do not modify generated output in `dist/` unless the task explicitly asks for build artifacts.
- Do not touch unrelated untracked files or local editor/tooling folders such as `.claude/`.

## UI Guidance

- Use `UI/variant-cosmic.jsx` as the primary UI/UX design reference for active app UI work unless a task explicitly asks for a different direction.
- Follow the Cosmic Pop design language: bold editorial composition, large serif display headings, high-contrast color blocks, chunky rounded controls, sticker-like accents, expressive tabs/chips, and clear page-specific accent hues.
- Keep the five core app areas aligned with the Cosmic sample structure: Documents, Gallery, Users, Upload, and Settings.
- Support two theme modes, dark and light, for any new or updated UI. Dark mode should preserve the cosmic deep-background look; light mode should translate the same layout, accent colors, and component personality onto a readable light surface.
- Implement theme styling through the existing theme system in `src/ThemeContext.jsx` and CSS variables/classes where possible, rather than hard-coding one-off colors throughout components.
- Maintain strong contrast, readable text, stable spacing, and responsive layouts in both modes.
- Build actual app screens and controls, not landing-page or marketing sections, unless explicitly requested.
- Check responsive behavior for pages, nav, modals, and upload/document workflows when changing UI.

## Verification

- Run `npm run lint` after code changes when feasible.
- Run `npm run build` for route, config, dependency, or larger UI changes.
- If starting a dev server, report the local URL and leave it running only when useful for the user.
