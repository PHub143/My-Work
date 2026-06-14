# AGENTS.md — `src/pages/`

Route-level screens — each page has a matching `.jsx` file and (usually) a matching `.css` file.

## Conventions

- Pages are loaded via `React.lazy()` in `App.jsx`. Keep the lazy import pattern.
- Keep page-specific styles in the matching `.css` file. Use shared styles in component CSS or app/global CSS for reusable rules.
- Follow the Cosmic Pop design language: bold editorial composition, high-contrast color blocks, chunky controls, expressive tabs/chips, and page-specific accent hues.

## Pages

| Route | File | Auth | Description |
|---|---|---|---|
| `/` | `Documents.jsx` | Protected (Drive) | Document listing |
| `/gallery` | `Gallery.jsx` | Protected (Drive) | Image/media gallery |
| `/upload` | `Upload.jsx` | Protected (Drive) | File upload |
| `/users` | `Users.jsx` | Admin | User management |
| `/settings` | `Settings.jsx` | Admin | Drive config, app settings |
| `/learning/ai-103` | `AI103.jsx` | Student | AI-103 study material |
| `/learning/ai-103/practice` | `AI103Practice.jsx` | Student | AI-103 practice questions |
| `/login` | `Login.jsx` | Public | Login/sign-in |
| `/oauth/callback` | `OAuthCallback.jsx` | Public | OAuth redirect handler |
