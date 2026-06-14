# AGENTS.md — `utils/`

Shared utility modules.

## Files

| File | Description |
|---|---|
| `encryption.js` | AES-256-GCM/CBC encrypt/decrypt for Drive config secrets. Uses `ENCRYPTION_KEY` from env. |
| `roles.js` | Role normalization (`ADMIN`, `STUDENT`), `isAdminUser()`, `hasRole()`, `primaryRole()`, `withNormalizedRoles()` |

## Encryption

- Uses `crypto` module with `aes-256-gcm` (default) and legacy `aes-256-cbc` support.
- Encrypted format: `iv:authTag:encrypted` (GCM) or `iv:encrypted` (legacy CBC).
- Requires `ENCRYPTION_KEY` (64-char hex) in environment.

## Roles

- Allowed roles: `ADMIN`, `STUDENT`.
- Legacy `USER` role is mapped to `STUDENT`.
- Exports: `ROLES`, `ALLOWED_ROLES`, `normalizeRoles`, `getUserRoles`, `hasRole`, `isAdminUser`, `primaryRole`, `withNormalizedRoles`.
