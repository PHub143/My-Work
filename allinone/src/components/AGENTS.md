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
| `AdminRoute.jsx` | Admin-only pages (`/users`, `/feedback`, `/content`, `/settings`) | ADMIN role |
| `LearningRoute.jsx` | Student learning paths (`/learning/*`) | STUDENT role |

## Shared UI Components

| Component | Description |
|---|---|
| `AppRail.jsx` | Left icon rail: primary nav, theme toggle, sign in/out. Replaces the old `Navbar`/`Logo`. |
| `TopBar.jsx` | 56px bar above signed-in pages: search, `DriveSwitcher`, one primary action. |
| `LearningTabs.jsx` | Top track switcher for the learning area: Home / AI / English. The AI tab covers both `/learning/ai-103` and `/learning/ai-102`. |
| `AiTrackSwitch.jsx` | AI-103 ↔ AI-102 segmented sub-switch shown on those two pages (parallel to `ToeicCollectionSwitch` for English). |
| `LoginBrandPanel.jsx` | Left-side branding panel on the chromeless `/login` screen. |
| `Spinner.jsx` | Loading spinner fallback for `Suspense` |
| `FileModal.jsx` | File preview/action modal |
| `FeedbackModal.jsx` | Feedback submit dialog opened from `AppRail`; category + message + up to 3 image attachments |
| `DriveSwitcher.jsx` | Google Drive configuration selector |
| `AccessLocked.jsx` | Non-admin access denied screen |
| `PassagePanel.jsx` | Reading passage renderer for English learning pages (blank markers, multi-passage sets) |
| `ListeningPlayer.jsx` | Sequential audio-clip player for English listening; locked exam mode plays once, study mode allows replay |

## Theme

Implement theme styling through `ThemeContext`, CSS variables, and existing theme classes. Support both dark and light themes for new or updated UI.
