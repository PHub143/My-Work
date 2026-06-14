# AGENTS.md — `src/`

Instructions for `src/` — the core frontend application code. Also follow `../AGENTS.md` (project-level) and child `AGENTS.md` files; this file takes precedence for files inside this directory.

## Entry Point

- `main.jsx` — Vite entry point. Mounts `<App />` to `#root`.
- `App.jsx` — wires providers, lazy routes, route guards, `HashRouter`, and `OAuthDetector`.

## OAuth Contract

- Preserve `OAuthDetector` in `App.jsx`. The OAuth flow depends on catching `?code` from the browser query string and forwarding to the hash route `/oauth/callback`.
- Preserve `HashRouter`; GitHub Pages routing depends on hash URLs.

## Route Guard Layering

1. `ProtectedRoute` — requires a configured Drive. Non-admin users without a configured Drive see `AccessLocked`. Admins without config are redirected to `/settings`.
2. `AuthenticatedRoute` — requires any logged-in user. Used for `/upload`.
3. `AdminRoute` — requires role `ADMIN`. Used for `/users` and `/settings`.
4. `LearningRoute` — requires role `STUDENT`. Used for `/learning/*`.

Public routes: `/login`, `/oauth/callback`.

Backend `GET /files` and `GET /tags` are public; do not add frontend auth assumptions around them unless backend behavior changes.

## State Management

- `AuthContext.jsx` — authentication state, login/logout, user object.
- `DriveContext.jsx` — selected/active Drive configuration.
- `ThemeContext.jsx` — dark/light theme, CSS variable application.
- State is managed with Context API and React hooks only. Do not add Redux, Zustand, or other state frameworks.

## Config

`config.js` defines API selection (`API_URL`), upload limits, and allowed upload types. Do not hard-code production API URLs outside this file.

## API Contract

- Preserve existing public API response shapes unless a breaking change is explicitly requested and coordinated across frontend and backend.
- Coordinate auth, Drive config, uploads, file-list, tag, and OAuth changes across both subprojects.
- Keep API calls aligned with backend response shapes.

## References

- [`components/AGENTS.md`](components/AGENTS.md) — shared UI components, route guards
- [`pages/AGENTS.md`](pages/AGENTS.md) — page-level screens, lazy loading
- [`utils/AGENTS.md`](utils/AGENTS.md) — helpers, role logic, learning module
- [`data/AGENTS.md`](data/AGENTS.md) — content JSON files
- [`assets/AGENTS.md`](assets/AGENTS.md) — images and static assets
