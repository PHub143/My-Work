# Architecture

Cross-cutting picture not captured in any single AGENTS.md. Workspace rules and the fullstack contract are in the root `AGENTS.md`; subproject internals in their own `AGENTS.md`.

## Topology

- `allinone/` deploys to GitHub Pages (base `/My-Work/allinone/`) via `.github/workflows/deploy.yml` on push to main.
- `api/` deploys to Render at `https://my-work-9b66.onrender.com`; database is Neon Postgres.
- The frontend picks its API in `allinone/src/config.js`: `localhost:3001` in dev, Render in prod builds or when `VITE_USE_PROD_API=true` (`npm run dev:prod`).

## Data

- Google Drive holds file content; Postgres holds the catalog and auth/config metadata (`File`, `Tag`, `User`, `DriveConfig` — see `api/prisma/schema.prisma`).
- `npm run db:sync` (in `api/`) mirrors Drive files into the DB.
- Multi-drive support: each `DriveConfig` row carries one drive's OAuth credentials; `clientSecret` and `refreshToken` are stored AES-256-GCM encrypted via `api/utils/encryption.js` (hex `ENCRYPTION_KEY` env var).

## Auth and roles

- App login is JWT-based (`api/controllers/userAuthController.js`, enforced by `api/middleware/authMiddleware.js`). Google OAuth is separate — it only authorizes Drive access for a `DriveConfig`.
- Roles are `ADMIN` and `STUDENT`, stored in `User.roles` (JSON array) alongside a legacy `role` string; legacy `USER` normalizes to `STUDENT`.
- Role normalization is deliberately mirrored in `api/utils/roles.js` (CommonJS) and `allinone/src/utils/roles.js` (ESM). Change them together.
- Frontend gating: `ProtectedRoute` (any logged-in user), `AdminRoute`, `LearningRoute` wrap route groups in `allinone/src/App.jsx`; global state comes from `AuthContext`, `DriveContext`, `ThemeContext` providers around the `HashRouter`.
