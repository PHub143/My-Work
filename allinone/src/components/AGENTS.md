# AGENTS.md — `src/components/`

Shared UI components, navigation, route guards, modals, and loading states.

## Conventions

- Use function components with React hooks. Keep imports relative.
- Keep component-specific styles in a matching `.css` file in this directory.
- Use theme variables from `ThemeContext` for dark/light support; maintain strong contrast, readable text, stable spacing, and responsive layouts.

## Route Guards

| Component | Purpose | Auth Required |
|---|---|---|
| `ProtectedRoute.jsx` | Drive config check; admin redirects to `/settings`, non-admins see `AccessLocked` | Authenticated + Drive |
| `AuthenticatedRoute.jsx` | Any logged-in user | Authenticated |
| `AdminRoute.jsx` | Admin-only pages (`/users`, `/content`, `/settings`) | ADMIN role |
| `LearningRoute.jsx` | Student learning paths (`/learning/*`) | STUDENT role |

## Shared UI Components

| Component | Description |
|---|---|
| `Navbar.jsx` | Top navigation bar |
| `Logo.jsx` | App logo/branding |
| `Spinner.jsx` | Loading spinner fallback for `Suspense` |
| `FileModal.jsx` | File preview/action modal |
| `DriveSwitcher.jsx` | Google Drive configuration selector |
| `AccessLocked.jsx` | Non-admin access denied screen |
| `PassagePanel.jsx` | Reading passage renderer for English learning pages (blank markers, multi-passage sets) |
| `ListeningPlayer.jsx` | Sequential audio-clip player for English listening; locked exam mode plays once, study mode allows replay |

## Theme

Implement theme styling through `ThemeContext`, CSS variables, and existing theme classes. Support both dark and light themes for new or updated UI.
