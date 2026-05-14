# Coding Agent Instructions

Use this file for workspace-level guidance. When working inside a subproject,
also read and follow that subproject's own `AGENTS.md`; the more specific file
takes precedence.

## Workspace Overview

This repository is a fullstack Google Drive-backed file catalog.

- `allinone/`: React + Vite frontend.
- `api/`: Node.js + Express backend with Prisma and PostgreSQL.
- `.github/workflows/`: deployment automation for the frontend.

Keep frontend and backend changes scoped to the relevant project unless the task
explicitly needs fullstack coordination.

## Before Editing

- Check the current git status before making changes.
- Do not revert or overwrite user changes.
- Read the relevant local files before assuming implementation details.
- Prefer existing patterns, naming, and structure over new abstractions.
- Never commit secrets, tokens, database URLs, OAuth credentials, `.env` files, or
  local Google credential files.

## Project-Specific Guidance

- For frontend work, read `allinone/AGENTS.md` first.
- For backend work, read `api/AGENTS.md` first.
- If a root instruction conflicts with a subproject instruction, follow the
  subproject instruction for files inside that subproject.

## Common Commands

Run commands from the project directory they apply to.

Frontend (`allinone/`):

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

Backend (`api/`):

- Install dependencies: `npm install`
- Start server: `npm start`
- Generate Prisma client: `npx prisma generate`
- Open Prisma Studio: `npm run db:studio`

Do not run backend commands that mutate the database unless the task requires it
and the target database is known to be safe.

## Fullstack Contracts

- Preserve existing public API response shapes unless a breaking change is
  explicitly requested.
- Coordinate frontend API usage with backend route/controller behavior.
- Keep authentication and authorization behavior consistent across frontend
  route guards and backend middleware.
- Treat Google Drive sync, uploads, and database schema changes as integration
  work that may need credentials and a safe database.

## Verification

Use the narrowest verification that proves the change:

- Frontend UI or routing changes: `npm run lint`, and `npm run build` when
  feasible.
- Backend JavaScript changes: `node -c <file>` for edited CommonJS files.
- Backend Prisma/schema changes: `npx prisma generate`; database sync commands
  require explicit care.
- Fullstack behavior changes: verify both sides and mention any blocked checks.

If verification cannot run because credentials, environment variables, or a safe
database are unavailable, state that clearly in the final response.

## Style And Maintenance

- Keep edits small and directly related to the request.
- Avoid changing generated output such as `allinone/dist/` unless explicitly
  requested.
- Keep comments brief and useful.
- Prefer structured APIs and existing helpers over ad hoc parsing.
- Update documentation when behavior, setup, or commands change.
