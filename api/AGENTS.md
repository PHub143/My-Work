# AGENTS.md

Backend-specific instructions for `api/`. Also follow the root `../AGENTS.md`;
this file takes precedence for files inside this subproject.

## Project Boundaries

- Express 5 backend using CommonJS (`require`, `module.exports`). Do not convert backend files to ESM unless explicitly requested.
- Prisma 7 + PostgreSQL uses the `@prisma/adapter-pg` adapter with `pg.Pool` in `services/prismaService.js`.
- Google Drive API v3 is the file-content source; PostgreSQL stores catalog and auth/config metadata.
- Uploads stream through `busboy` directly into the Drive API. Do not buffer uploaded files in memory or write temp files.
- `server.js` patches `BigInt.prototype.toJSON` for safe JSON serialization of Prisma `BigInt` values (e.g. `File.size`); preserve this if touching response serialization.

## Commands

Run from `api/`.

```
npm start            # starts server on PORT (default 3001)
npx prisma generate  # safe Prisma client regeneration after schema changes
npm run db:studio    # Prisma Studio
npm run db:sync      # syncs Drive files into DB; integration operation
npm test             # placeholder; exits with code 1
```

Do not report `npm test` as passing. It is currently a placeholder failure.

Important: `npm run build` runs `npx prisma generate && npx prisma db push --accept-data-loss`. This can mutate or drop database data. Use `npx prisma generate` for schema/client verification unless the user explicitly approves database synchronization against a safe target.

## Structure

| Directory | Purpose |
|---|---|
| [`routes/`](routes/AGENTS.md) | URL declarations and middleware chains |
| [`controllers/`](controllers/AGENTS.md) | Request validation and response flow |
| [`services/`](services/AGENTS.md) | Business logic, Prisma, Drive API, config encryption |
| [`middleware/`](middleware/AGENTS.md) | Auth (JWT) and authorization helpers |
| [`prisma/`](prisma/AGENTS.md) | Database schema and models |
| [`config/`](config/AGENTS.md) | Environment variables, CORS, Google credentials |
| [`scripts/`](scripts/AGENTS.md) | Operational jobs (Drive sync, seed, token utilities) |
| [`utils/`](utils/AGENTS.md) | Encryption, role normalization |

Keep the route/controller/service layering intact.

## General Rules

- Use CommonJS for JavaScript files.
- Validate request input in controllers before calling services.
- Use centralized error handling: throw or pass errors with optional `status` and `message`.
- Avoid introducing new frameworks, ORMs, upload middleware, or build tooling unless required by the task.
- Never commit real secrets, tokens, database URLs, `.env` files, refresh tokens, client secrets, or Google OAuth credentials.
- Coordinate response shape, auth, upload, Drive config, file-list, and tag changes with frontend callers in `../allinone/`.

## Fullstack Contract

- CORS uses a dynamic origin check. It allows localhost origins and the configured `FRONTEND_URL`; do not replace it with a wildcard.
- Frontend uses `HashRouter`; OAuth depends on the frontend `OAuthDetector` forwarding query-string `?code` into `#/oauth/callback`.

## Verification

Choose the narrowest useful check:

| Change | Command |
|---|---|
| Edited CommonJS file | `node -c <file>` |
| Prisma schema/client | `npx prisma generate` |
| Full server startup | `npm start` with valid `.env`, then stop it |
| Database/Drive integration | requires credentials and a safe database |

If verification is blocked by missing env vars, credentials, or database access,
state that clearly.
