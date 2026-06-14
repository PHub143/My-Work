# AGENTS.md — `routes/`

URL declarations and middleware chains. Keep the route/controller/service layering intact.

## Files

| File | Description |
|---|---|
| `index.js` | Mounts all route modules on the Express app |
| `authRoutes.js` | Authentication endpoints (login, register) |
| `configRoutes.js` | Drive config CRUD, listing |
| `fileRoutes.js` | File upload, listing, management |
| `userRoutes.js` | User management (admin) |

## API And Auth Conventions

- Public file-list endpoints: `GET /files` and `GET /tags`.
- Admin-only file mutations use `authenticateToken` and `isAdmin`.
- Config listing endpoints are public where needed by the frontend drive switcher.
- Config mutation and sync endpoints require admin auth.
- Return JSON errors in the existing `{ message: string }` style.
- Preserve existing public API response shapes unless a breaking change is explicitly requested and coordinated with the frontend.

When adding protected endpoints, use middleware from `middleware/authMiddleware.js`.
