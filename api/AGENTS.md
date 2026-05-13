# AGENTS.md

Guidance for AI agents working in this backend repository.

## Project Overview

This is a CommonJS Node.js/Express backend for a Google Drive-backed file catalog.
It stores metadata in PostgreSQL through Prisma 7 and uses Google Drive as the
source of file content.

Main responsibilities:

- HTTP API in `server.js` and `routes/`
- request handling in `controllers/`
- database and third-party logic in `services/`
- authentication and authorization in `middleware/`
- Prisma schema in `prisma/schema.prisma`
- operational scripts in `scripts/`

Keep the route/controller/service layering intact. Routes should declare URL
shape and middleware, controllers should validate request/response flow, and
services should own persistence or Google Drive behavior.

## Runtime And Commands

- Install dependencies: `npm install`
- Start API locally: `npm start`
- Generate Prisma client: `npx prisma generate`
- Open Prisma Studio: `npm run db:studio`
- Sync Google Drive metadata into the database: `npm run db:sync`

Important command caveat:

- `npm run build` runs `npx prisma generate && npx prisma db push --accept-data-loss`.
  Do not use it casually against shared or production databases. Prefer
  `npx prisma generate` for normal verification unless the task explicitly
  requires schema synchronization.
- `npm test` is currently a placeholder that exits with failure. Do not report
  tests as passing unless a real test command has been added or a different
  verification command was run.

## Environment

The app loads `.env` through `dotenv`. Expected variables include:

- `DATABASE_URL`: PostgreSQL connection string used by `services/prismaService.js`
  and Prisma config.
- `DIRECT_URL`: optional direct database URL for Prisma; falls back to
  `DATABASE_URL`.
- `PORT`: optional API port; defaults to `3001`.
- `FRONTEND_URL`: allowed non-localhost CORS origin.
- `JWT_SECRET`: JWT signing and verification secret. The code has a development
  fallback, but production must provide this.
- `ENCRYPTION_KEY`: hex-encoded 32-byte key for AES-256 encryption of Drive
  secrets. Required whenever encrypting or decrypting Drive config secrets.

Never commit real secrets, tokens, database URLs, or Google OAuth credentials.

## Data Model

Prisma models currently include:

- `File`: cached Google Drive file metadata, linked by unique `driveFileId`.
- `User`: local user credentials and role.
- `Tag`: many-to-many labels for files.
- `DriveConfig`: encrypted Google OAuth configuration and target folder.

`File.size` is a `BigInt`. `server.js` patches `BigInt.prototype.toJSON` so API
responses serialize safely. Preserve this behavior when touching response
serialization.

## API And Auth Conventions

- Public file endpoints include `GET /files` and `GET /tags`.
- Admin-only file mutations use `authenticateToken` and `isAdmin`.
- Config listing endpoints are public where needed by the drive switcher.
- Config mutation and sync endpoints require admin auth.
- JWT payloads currently include `id`, `email`, `role`, and `name`.

When adding protected endpoints, use the existing middleware from
`middleware/authMiddleware.js` and return JSON errors in the existing
`{ message: string }` style.

## Google Drive Behavior

Drive credentials are stored in `DriveConfig`; sensitive fields are encrypted in
`configService` and decrypted only when creating a Drive client.

File upload flow:

1. `routes/fileRoutes.js` protects `POST /upload`.
2. `controllers/fileController.js` calls `googleDriveService.uploadFile`.
3. Uploaded Drive metadata is cached through `fileService.createFile`.
4. If database caching fails after Drive upload, the controller tries to delete
   the orphaned Drive file.

Sync behavior:

- `server.js` schedules a full sync hourly and runs an initial sync at startup.
- `scripts/sync-drive.js` syncs each configured drive, removes orphaned database
  records, upserts Drive files, and attempts to make synced files public.
- `npm run db:sync` can call Google APIs and mutate local database state. Treat it
  as an integration operation, not a cheap unit check.

Large uploads are supported with long server timeouts and `busboy` streaming.
Avoid changes that buffer uploaded files into memory.

## Prisma Guidelines

- Use the singleton Prisma client from `services/prismaService.js`.
- Keep Prisma schema changes in `prisma/schema.prisma`.
- After schema changes, run `npx prisma generate`.
- Do not run `prisma db push --accept-data-loss` against a database unless the
  user explicitly approves or the environment is clearly disposable.
- Prefer structured Prisma queries over raw SQL unless there is a strong reason.

## Code Style

- Use CommonJS (`require`, `module.exports`) for JavaScript files.
- Keep error responses consistent with the centralized Express error handler:
  throw or pass errors with optional `status` and `message`.
- Validate request input in controllers before calling services.
- Keep service functions focused and reusable.
- Avoid introducing new frameworks or build tooling unless required by the task.
- Preserve existing public API shapes unless the user asks for a breaking change.

## Verification

Choose verification based on the change:

- Syntax/runtime smoke check: `node -c <file>` for edited CommonJS files.
- Prisma client/schema check: `npx prisma generate`.
- Server startup check: `npm start` with valid env vars, then stop it.
- Database/Drive integration check: only run when credentials and a safe database
  are available.

If verification is blocked by missing env vars, missing credentials, or the
placeholder test script, state that clearly in the final response.

