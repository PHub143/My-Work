# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Fullstack app: `allinone/` (React 19 + Vite SPA) and `api/` (Express 5 + Prisma/Postgres) with Google Drive as file storage.

## Instruction files (each is the single source of truth for its scope)

@AGENTS.md
@.claude/rules/architecture.md

- `allinone/AGENTS.md` — frontend rules, commands, verification. Auto-loads via `allinone/CLAUDE.md` when working there.
- `api/AGENTS.md` — backend rules, commands, verification. Auto-loads via `api/CLAUDE.md` when working there.
- Nested `AGENTS.md` files exist per directory (e.g. `api/services/AGENTS.md`) — read the one for the directory you're editing.
- `.cursor/rules/light-dark-mode-text-contrast.mdc` — **read before any light/dark theming CSS work** (documents a lightningcss minifier bug and its fix).

## Quick commands

Full tables live in the subproject AGENTS.md files. Most used, from each subproject dir:

- Frontend: `npm run dev` (local API) · `npm run dev:prod` (Render API) · `npm run build` · `npm run lint` · `npm test` (real `node:test` suite)
- Backend: `npm start` · `npx prisma generate` · `npm run db:sync` · `npm run db:studio`

Safety: in `api/`, `npm run build` runs `prisma db push --accept-data-loss` (can destroy DB data — prefer `npx prisma generate`). `api/`'s own `npm test` is a placeholder that always exits 1 — it does *not* run the two real `node:test` files that exist there (`api/auth-role.test.js`, `api/controllers/learningResultController.test.js`); run those directly with `node --test <file>`. `allinone/`'s `npm test` is real (see above) but has one known pre-existing failure — see `allinone/src/utils/AGENTS.md`.
