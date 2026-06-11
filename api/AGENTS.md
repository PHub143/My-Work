# AGENTS.md

Backend-specific instructions for `api/`. Also follow the root `../AGENTS.md`;
this file takes precedence for files inside this subproject.

## Project Boundaries

- Express 5 backend using CommonJS (`require`, `module.exports`). Do not convert
  backend files to ESM unless explicitly requested.
- Prisma 7 + PostgreSQL uses the `@prisma/adapter-pg` adapter with `pg.Pool` in
  `services/prismaService.js`.
- Google Drive API v3 is the file-content source; PostgreSQL stores catalog and
  auth/config metadata.
- Uploads stream through `busboy` directly into the Drive API. Do not buffer
  uploaded files in memory or write temp files unless a task explicitly asks for
  a different upload architecture.
- `server.js` patches `BigInt.prototype.toJSON` for safe JSON serialization of
  Prisma `BigInt` values such as `File.size`; preserve this if touching response
  serialization.

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

Important: `npm run build` runs `npx prisma generate && npx prisma db push
--accept-data-loss`. This can mutate or drop database data. Use
`npx prisma generate` for schema/client verification unless the user explicitly
approves database synchronization against a safe target.

## Structure

- `server.js` configures Express, CORS, route mounting, timeouts, scheduled sync,
  and centralized error handling.
- `routes/` declares URLs and middleware.
- `controllers/` validates request/response flow.
- `services/` owns Prisma persistence, Google Drive behavior, config encryption,
  and business logic.
- `middleware/` contains auth and authorization helpers.
- `prisma/schema.prisma` owns the database schema.
- `scripts/` contains operational jobs such as Drive sync.

Keep the route/controller/service layering intact.

## Environment And Secrets

The app loads `.env` through `dotenv`. Common variables:

- `DATABASE_URL`: PostgreSQL connection string used by Prisma and
  `services/prismaService.js`.
- `DIRECT_URL`: optional direct database URL for Prisma; falls back to
  `DATABASE_URL`.
- `PORT`: optional API port; defaults to `3001`.
- `FRONTEND_URL`: allowed non-localhost CORS origin.
- `JWT_SECRET`: JWT signing/verification secret. Production must provide this.
- `ENCRYPTION_KEY`: 64-character hex key for AES-256 encryption/decryption of
  Drive config secrets.

Never commit real secrets, tokens, database URLs, `.env` files, refresh tokens,
client secrets, or Google OAuth credentials.

## Data Model And Prisma

Current Prisma models include:

- `File`: cached Google Drive metadata, linked by unique `driveFileId`.
- `User`: local credentials and role.
- `Tag`: many-to-many labels for files.
- `DriveConfig`: encrypted Google OAuth configuration and target folder.

Guidelines:

- Use the singleton Prisma client from `services/prismaService.js`.
- Preserve the `PrismaPg` adapter and `pg.Pool` pattern unless a tested migration
  is explicitly requested.
- Keep schema changes in `prisma/schema.prisma`.
- After schema changes, run `npx prisma generate`.
- Prefer structured Prisma queries over raw SQL unless there is a strong reason.
- Do not run `prisma db push --accept-data-loss` without explicit approval and a
  safe database.

## API And Auth Conventions

- Public file-list endpoints include `GET /files` and `GET /tags`.
- Admin-only file mutations use `authenticateToken` and `isAdmin`.
- Config listing endpoints are public where needed by the frontend drive
  switcher.
- Config mutation and sync endpoints require admin auth.
- JWT payloads currently include `id`, `email`, `role`, and `name`.
- Return JSON errors in the existing `{ message: string }` style.
- Preserve existing public API response shapes unless a breaking change is
  explicitly requested and coordinated with the frontend.

When adding protected endpoints, use middleware from
`middleware/authMiddleware.js`.

## Google Drive And Sync Behavior

- Drive secrets (`clientSecret`, `refreshToken`) are encrypted at rest through
  `utils/encryption.js` and config services.
- Decrypt secrets only when creating a Drive client.
- `server.js` schedules `syncDatabase()` hourly and runs an initial sync on
  startup. Startup tolerates unconfigured Drive with a warning.
- `scripts/sync-drive.js` syncs each configured drive, removes orphaned database
  records, upserts Drive files, and attempts to make synced files public.
- `npm run db:sync` can call Google APIs and mutate database state. Treat it as
  an integration operation, not a cheap verification command.

Upload flow:

1. `routes/fileRoutes.js` protects `POST /upload`.
2. `controllers/fileController.js` calls `googleDriveService.uploadFile`.
3. Uploaded Drive metadata is cached through `fileService.createFile`.
4. If database caching fails after Drive upload, the controller tries to delete
   the orphaned Drive file.

## CORS And Fullstack Contract

- CORS uses a dynamic origin check. It allows localhost origins and the
  configured `FRONTEND_URL`; do not replace it with a wildcard.
- Frontend uses `HashRouter`; OAuth depends on the frontend `OAuthDetector`
  forwarding query-string `?code` into `#/oauth/callback`.
- Coordinate response shape, auth, upload, Drive config, file-list, and tag
  changes with frontend callers in `../allinone/`.

## Code Style

- Use CommonJS for JavaScript files.
- Validate request input in controllers before calling services.
- Keep service functions focused and reusable.
- Use centralized error handling patterns: throw or pass errors with optional
  `status` and `message`.
- Avoid introducing new frameworks, ORMs, upload middleware, or build tooling
  unless required by the task.

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
