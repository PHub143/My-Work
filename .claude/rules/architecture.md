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

## YBM asset pipeline

The YBM TOEIC feature (`allinone/src/pages/English.jsx`, `YbmExam.jsx`,
`data/ybm/manifest.js`) needs a booklet-page image per test page plus one
listening-track MP3, per test, per volume — far too much binary data to ship
in either app's repo. Digitising one test is a two-step pipeline:

1. `scripts/ybm/render-pages.mjs --vol <n> --test <n>` rasterises the source
   PDFs/audio (paths hardcoded per volume in that file) into
   `allinone/public/ybm/<testId>/lc-p01.jpg, ..., listening.mp3` — local-only,
   `public/ybm/` is gitignored in `allinone/.gitignore`.
2. `api/scripts/upload-ybm-assets.js <testId>` pushes that folder to the app's
   Google Drive (under an `ybm/<testId>/` folder in the configured
   `DriveConfig`) and writes `api/data/ybm-assets/<testId>.json`, a
   `{ filename: driveFileId }` manifest — this one *is* committed (it's tiny).

At runtime, `GET /ybm/:testId/:filename` (`api/routes/ybmAssetRoutes.js` →
`services/ybmAssetService.js`) looks up the manifest and streams the file
straight from Drive through the API. **Don't embed Drive download links
(`drive.google.com/uc?export=download`) directly in `<img>`/`<audio>` tags** —
Drive's CDN sets `Cross-Origin-Resource-Policy: same-site`, which browsers
silently block for cross-origin embeds even though the same URL fetches fine
via `curl` or a server-side request; this proxy route exists specifically to
work around that. `allinone/src/utils/ybm.js` picks `ASSET_BASE` the same way
`config.js` picks `API_URL` — the local `public/ybm/` folder in plain dev,
the API's `/ybm` route whenever the app is talking to the real API (prod
build, or `VITE_USE_PROD_API=true` / `npm run dev:prod`) — so a test only
needs step 1 to work locally, and both steps to work in production.

## Auth and roles

- App login is JWT-based (`api/controllers/userAuthController.js`, enforced by `api/middleware/authMiddleware.js`). Google OAuth is separate — it only authorizes Drive access for a `DriveConfig`.
- Roles are `ADMIN` and `STUDENT`, stored in `User.roles` (JSON array) alongside a legacy `role` string; legacy `USER` normalizes to `STUDENT`.
- Role normalization is deliberately mirrored in `api/utils/roles.js` (CommonJS) and `allinone/src/utils/roles.js` (ESM). Change them together.
- Frontend gating: `ProtectedRoute` (any logged-in user), `AdminRoute`, `LearningRoute` wrap route groups in `allinone/src/App.jsx`; global state comes from `AuthContext`, `DriveContext`, `ThemeContext` providers around the `HashRouter`.
