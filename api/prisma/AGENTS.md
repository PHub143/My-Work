# AGENTS.md — `prisma/`

Database schema and Prisma configuration.

## Files

| File | Description |
|---|---|
| `schema.prisma` | Prisma schema defining all models |

## Data Model

| Model | Description |
|---|---|
| `File` | Cached Google Drive metadata, linked by unique `driveFileId`. Fields: `name`, `mimeType`, `webViewLink`, `thumbnailLink`, `size` (BigInt), timestamps. Relates to `User` (owner) and `Tag` (many-to-many). Supports multi-drive via `DriveConfig`. |
| `User` | Local credentials and role. Fields: `email` (unique), `name`, `password`, `role` (default `"USER"`), `roles` (JSON, default `["STUDENT"]`). |
| `Tag` | Many-to-many labels for files. Fields: `name` (unique). |
| `DriveConfig` | Encrypted Google OAuth configuration and target folder. Fields: `name`, `clientId`, `clientSecret` (encrypted), `redirectUri`, `refreshToken` (encrypted), `folderId`, `isDefault`, timestamps. |

## Guidelines

- Use the singleton Prisma client from `services/prismaService.js`.
- Preserve the `PrismaPg` adapter and `pg.Pool` pattern unless a tested migration is explicitly requested.
- Keep schema changes in `schema.prisma`.
- After schema changes, run `npx prisma generate`.
- Prefer structured Prisma queries over raw SQL unless there is a strong reason.
- Do not run `prisma db push --accept-data-loss` without explicit approval and a safe database.
