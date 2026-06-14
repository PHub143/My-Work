# AGENTS.md — `config/`

Environment configuration and Google OAuth credentials.

## Files

| File | Description |
|---|---|
| `google.json` | Google OAuth client credentials, refresh token, and Drive folder ID |

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

Never commit real secrets, tokens, database URLs, `.env` files, refresh tokens, client secrets, or Google OAuth credentials.
