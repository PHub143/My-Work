# AGENTS.md — `config/`

Local-only environment configuration. **No real secrets belong in this directory** —
the production app loads credentials from the database (DriveConfig rows, encrypted with
`utils/encryption.js`) and from `.env`.

## Files

| File | Description |
|---|---|
| `google.json` | Local-only template used by the legacy token scripts (`scripts/get-token.js`, `scripts/get-token-fallback.js`, `scripts/test-token.js`). **Gitignored.** Contains placeholder values only — copy the template to `api/config/google.json` outside version control and fill in values from Google Cloud Console. The running app does not read this file; Drive config is stored encrypted in the `DriveConfig` table and managed via the Settings UI. |

## Environment Variables

The app loads `.env` through `dotenv`. Common variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma and `services/prismaService.js` |
| `DIRECT_URL` | Optional direct database URL for Prisma; falls back to `DATABASE_URL` |
| `PORT` | API port; defaults to `3001` |
| `FRONTEND_URL` | Allowed non-localhost CORS origin |
| `JWT_SECRET` | JWT signing/verification secret. Production must provide this. |
| `ENCRYPTION_KEY` | 64-character hex key for AES-256 encryption/decryption of Drive config secrets |

## CORS

CORS uses a dynamic origin check. It allows localhost origins and the configured `FRONTEND_URL`; do not replace it with a wildcard.

## Secrets

Never commit real secrets, tokens, database URLs, `.env` files, refresh tokens, client secrets, or Google OAuth credentials. The `config/` directory is gitignored for anything beyond this AGENTS.md file.
