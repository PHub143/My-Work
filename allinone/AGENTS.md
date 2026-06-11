# AGENTS.md

Frontend-specific instructions for `allinone/`. Also follow the root
`../AGENTS.md`; this file takes precedence for files inside this subproject.

## Project Boundaries

- React 19 + Vite 8 app using JavaScript/JSX only; do not introduce TypeScript.
- Package is ESM (`"type": "module"`). Keep frontend modules ESM.
- Routing uses `HashRouter`; deployed GitHub Pages base path is
  `/My-Work/allinone/`.
- State is managed with Context API and React hooks. Do not add Redux, Zustand,
  or other state frameworks unless explicitly requested.
- Styling is plain CSS. Do not introduce CSS-in-JS, Tailwind, Sass, or component
  libraries unless the task requires it.
- Built output goes to `dist/`; do not edit generated files unless explicitly
  asked for build artifacts.

## Commands

Run from `allinone/`.

```
npm run dev          # Vite dev server against local API (localhost:3001)
npm run dev:prod     # Vite dev server against production API (Render)
npm run build        # production build -> dist/
npm run lint         # ESLint
npm run preview      # preview the built app
```

## Structure

- `src/App.jsx` wires providers, lazy routes, route guards, `HashRouter`, and the
  OAuth detector.
- `src/pages/` contains route-level screens and matching page CSS files.
- `src/components/` contains shared UI, navigation, route guards, modals, and
  loading states.
- `src/AuthContext.jsx`, `src/DriveContext.jsx`, and `src/ThemeContext.jsx` own
  app-level state.
- `src/config.js` defines API selection, upload limits, and allowed upload types.
- `UI/` contains design/reference variants. Do not treat it as the active app
  unless a task specifically asks for it.

## Route And OAuth Contract

- Preserve `HashRouter`; GitHub Pages routing depends on hash URLs.
- Preserve `OAuthDetector` in `src/App.jsx`. The OAuth flow depends on catching
  `?code` from the browser query string and forwarding to the hash route
  `/oauth/callback`.
- Route guard layering:
  1. `ProtectedRoute` requires a configured Drive. Non-admin users without a
     configured Drive are redirected to the contact-admin flow.
  2. `AuthenticatedRoute` requires any logged-in user and is used for `/upload`.
  3. `AdminRoute` requires role `ADMIN` and is used for `/users` and `/settings`.
- Public routes are `/login` and `/oauth/callback`.
- Backend file listing endpoints (`GET /files`, `GET /tags`) are public; do not
  add frontend auth assumptions around them unless backend behavior changes.

## Editing Guidance

- Follow the existing function component style and keep imports relative.
- Keep page-specific styles in the matching page CSS file when possible; keep
  shared styles in component CSS or app/global CSS as appropriate.
- Prefer small, scoped changes over route/provider/context reorganizations.
- Keep API calls aligned with backend response shapes; preserve existing user
  auth, Drive config, upload, tag, and file-list contracts unless a fullstack
  change is requested.
- Do not hard-code production API URLs outside the existing config mechanism.
- Do not touch unrelated untracked files or local editor/tooling folders.
- Never commit secrets, tokens, local env files, or OAuth credentials.

## UI Guidance

- Use `UI/variant-cosmic.jsx` as the primary UI/UX reference unless a task asks
  for another direction.
- Follow the Cosmic Pop design language already established here: bold editorial
  composition, high-contrast color blocks, chunky controls, expressive
  tabs/chips, and page-specific accent hues.
- Keep the core app areas aligned with the current structure: Documents,
  Gallery, Users, Upload, and Settings.
- Support both dark and light themes for new or updated UI.
- Implement theme styling through `src/ThemeContext.jsx`, CSS variables, and
  existing theme classes where possible.
- Maintain strong contrast, readable text, stable spacing, and responsive layouts
  for navigation, pages, modals, upload flows, and document/gallery views.
- Build actual app screens and controls, not marketing or landing-page sections,
  unless explicitly requested.

## Verification

Choose the narrowest useful check:

| Change | Command |
|---|---|
| Frontend code | `npm run lint` |
| Routes/config/dependencies/larger UI | `npm run build` |
| Browser behavior | start `npm run dev` or `npm run dev:prod` and verify locally |

If verification is blocked by missing backend env, credentials, or an unavailable
API, state that clearly.
