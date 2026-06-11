# AGENTS.md

Workspace-level guidance for the two-subproject repo.

## Subproject Instructions

- Frontend: read [`allinone/AGENTS.md`](allinone/AGENTS.md) before touching
  files in `allinone/`.
- Backend: read [`api/AGENTS.md`](api/AGENTS.md) before touching files in
  `api/`.
- The more specific subproject `AGENTS.md` takes precedence for files inside
  that subproject.

## Workspace Boundaries

- `allinone/` is the React/Vite frontend.
- `api/` is the Express/Prisma/PostgreSQL backend.
- `.github/workflows/` contains deployment automation, primarily for the
  frontend GitHub Pages deployment.
- Keep changes scoped to the relevant subproject unless the task requires
  fullstack coordination.

## Shared Fullstack Contract

- Preserve existing public API response shapes unless a breaking change is
  explicitly requested and coordinated across frontend and backend.
- Frontend routing uses `HashRouter`; OAuth depends on `OAuthDetector` in
  `allinone/src/App.jsx` catching browser query-string `?code` and forwarding it
  to `#/oauth/callback`.
- Backend `GET /files` and `GET /tags` are public file-list endpoints. Do not add
  frontend auth assumptions around them unless backend behavior changes.
- Coordinate auth, Drive config, uploads, file-list, tag, and OAuth changes
  across both subprojects.

## General Rules

- Check current git status before editing.
- Do not revert or overwrite user changes.
- Prefer existing patterns, names, helpers, and structure over new abstractions.
- Keep edits small and directly related to the request.
- Never commit secrets, tokens, database URLs, `.env` files, OAuth credentials,
  or local Google credential files.
- Avoid changing generated output such as `allinone/dist/` unless explicitly
  requested.

## Verification

Run commands from the applicable subproject directory and follow that
subproject's verification guidance:

- Frontend verification: [`allinone/AGENTS.md`](allinone/AGENTS.md#verification)
- Backend verification: [`api/AGENTS.md`](api/AGENTS.md#verification)

If verification is blocked by missing env vars, credentials, or a safe database,
state that clearly.
