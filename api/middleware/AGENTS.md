# AGENTS.md — `middleware/`

Auth and authorization helpers.

## Files

| File | Description |
|---|---|
| `authMiddleware.js` | JWT authentication (`authenticateToken`) and admin check (`isAdmin`) |

## Conventions

- JWT payloads currently include `id`, `email`, `role`, and `name`.
- `authenticateToken` verifies the JWT from the `Authorization` header.
- `isAdmin` checks the `role` in the JWT payload against the ADMIN role.
- When adding protected endpoints, use middleware from this file.
