# AGENTS.md

Frontend-specific instructions for `allinone/`. Also follow the root
`../AGENTS.md`; this file takes precedence for files inside this subproject.

## Project Boundaries

- React 19 + Vite 8 app using JavaScript/JSX only; do not introduce TypeScript.
- Package is ESM (`"type": "module"`). Keep frontend modules ESM.
- Routing uses `HashRouter`; deployed GitHub Pages base path is `/My-Work/allinone/`.
- Styling is plain CSS. Do not introduce CSS-in-JS, Tailwind, Sass, or component libraries unless the task requires it.
- Built output goes to `dist/`; do not edit generated files unless explicitly asked for build artifacts.

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

| Directory | Purpose |
|---|---|
| [`src/`](src/AGENTS.md) | Core app: entry, routes, state contexts, config |
| [`src/components/`](src/components/AGENTS.md) | Shared UI, navigation, route guards, modals |
| [`src/pages/`](src/pages/AGENTS.md) | Route-level screens, lazy loaded |
| [`src/utils/`](src/utils/AGENTS.md) | Helpers, role logic, learning module |
| [`src/data/`](src/data/AGENTS.md) | Static content JSON |
| [`src/assets/`](src/assets/AGENTS.md) | Images and media |
| [`UI/`](UI/AGENTS.md) | Design reference variants (not active app) |

## General Rules

- Prefer small, scoped changes over route/provider/context reorganizations.
- Do not touch unrelated untracked files or local editor/tooling folders.
- Never commit secrets, tokens, local env files, or OAuth credentials.
- Coordinate fullstack changes with `../api/`.

## Verification

Choose the narrowest useful check:

| Change | Command |
|---|---|
| Frontend code | `npm run lint` |
| Routes/config/dependencies/larger UI | `npm run build` |
| Browser behavior | start `npm run dev` or `npm run dev:prod` and verify locally |

If verification is blocked by missing backend env, credentials, or an unavailable
API, state that clearly.
