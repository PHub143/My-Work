# AGENTS.md — `services/`

Business logic, Prisma persistence, Google Drive behavior, config encryption.

## Files

| File | Description |
|---|---|
| `prismaService.js` | Singleton Prisma client with `PrismaPg` adapter and `pg.Pool` |
| `googleDriveService.js` | Google Drive API v3 interactions (upload, list, delete) |
| `fileService.js` | File metadata persistence and queries |
| `configService.js` | Drive config CRUD with encrypted secret storage |
| `userService.js` | User persistence and queries |
| `defaultAdminService.js` | Ensures a default admin user exists on startup |
| `learningResultService.js` | Learning-result persistence and queries |
| `feedbackService.js` | Feedback persistence and queries (author join + snapshot fallback) |
| `ybmAssetService.js` | Resolves a YBM test/filename to a Drive file ID (via `api/data/ybm-assets/<testId>.json`) and returns a readable stream from Drive; see `.claude/rules/architecture.md` "YBM asset pipeline" |

## Google Drive Behavior

- Drive secrets (`clientSecret`, `refreshToken`) are encrypted at rest through `utils/encryption.js`.
- Decrypt secrets only when creating a Drive client.
- Upload flow:
  1. `fileRoutes.js` protects `POST /upload`.
  2. `fileController.js` calls `googleDriveService.uploadFile`.
  3. Uploaded Drive metadata is cached through `fileService.createFile`.
  4. If database caching fails after Drive upload, the controller tries to delete the orphaned Drive file.
- `googleDriveService.uploadImage` is a separate small-image path used by feedback attachments: it enforces `image/*` + a byte cap and uploads into a `feedback/` **subfolder** of the configured Drive folder, so those files are never listed by `listFiles`/`db:sync` and don't leak into the catalog. `streamFile(fileId)` returns a raw Drive read stream for proxy routes.

## Conventions

- Use the singleton Prisma client from `prismaService.js`.
- Keep service functions focused and reusable.
- Use structured Prisma queries over raw SQL unless there is a strong reason.
- Uploads stream through `busboy` directly into the Drive API. Do not buffer uploaded files in memory or write temp files.
