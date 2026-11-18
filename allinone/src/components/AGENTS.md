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
| `AppNav.jsx` | The app shell navigation. Wide screens: top bar (wordmark, section links, feedback / theme / sign out, account badge). Phones: app bar + bottom tabs, with a "More" sheet for admins. Students get Home / AI / English as their links (the AI link covers `/learning/ai-103` and `/learning/ai-102`); admins get Study, Documents, Gallery, Inbox, Users, Feedback plus a Home / AI / English sub-nav inside `/learning`. Replaces the old `AppRail` and `LearningTabs`; pages must not render their own track tabs. |
| `TopBar.jsx` | 56px bar above signed-in pages: search, `DriveSwitcher`, one primary action. |
| `AiTrackSwitch.jsx` | AI-103 ↔ AI-102 segmented sub-switch shown on those two pages (parallel to `ToeicCollectionSwitch` for English). |
| `ToeicHub.jsx` | The TOEIC collection hub shared by `pages/English.jsx` (YBM) and `pages/Hacker.jsx`: collection switch, volume tabs, ready count and one card per test (Completed / In progress / Not started / Not available). Pages keep their own data and pass the resolved volume and statuses. Styles in `ToeicHub.css`. |
| `ToeicCollectionSwitch.jsx` | YBM / Hacker switch rendered by `ToeicHub`; the active tab does not navigate (the collection paths reset to Vol 2). |
| `ExamIcons.jsx` | Small stroke icons (arrows, check, cross, clock, zoom, retake) shared by the YBM/Hacker exam screens and their reading content. |
| `DriveIcons.jsx` | Stroke icons used only by the Drive pages (`Documents`, `Gallery`, `Upload`, `FileModal`, `DriveSwitcher`, `TopBar`). |
| `AiQuestionDetails.jsx` | The "Question details" side card on the AI-103 / AI-102 study pages. |
| `SettingsNotice.jsx` | Icon + lead word notice ("Done.", "Error.", "Setup needed.") used by `pages/Settings.jsx` and `MailAccountsSettings.jsx`. |
| `LoginBrandPanel.jsx` | Left-side branding panel on the chromeless `/login` screen. |
| `Spinner.jsx` | Loading spinner fallback for `Suspense` |
| `FileModal.jsx` | File preview/action modal |
| `FeedbackModal.jsx` | Feedback submit dialog opened from `AppNav`; category + message + up to 3 image attachments |
| `DriveSwitcher.jsx` | Google Drive configuration selector |
| `AccessLocked.jsx` | Non-admin access denied screen |
| `PassagePanel.jsx` | Reading passage renderer for English learning pages (blank markers, multi-passage sets) |
| `MailAccountsSettings.jsx` | Settings → Mail tab: Gmail account CRUD, Connect/Reconnect/Disconnect, set default (separate from Drive configs) |
| `mail/` | Inbox building blocks: `MailSidebar`, `MailToolbar`, `MailList`, `MailReader`, `MailBody` (HTML only inside a sandboxed iframe via `utils/mailHtml.js`; never `dangerouslySetInnerHTML`), `ComposeDialog` (native `<dialog>`, autosaves drafts), `ConfirmDialog`, `MailIcons` |
| `ListeningPlayer.jsx` | Sequential audio-clip player for English listening; locked exam mode plays once, study mode allows replay |

## Theme

Implement theme styling through `ThemeContext`, CSS variables, and existing theme classes. Support both dark and light themes for new or updated UI.
