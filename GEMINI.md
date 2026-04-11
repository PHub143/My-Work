# GEMINI.md - Project Mandates

This file contains foundational mandates for the Gemini CLI agent when working in this workspace. These instructions take absolute precedence over general workflows and tool defaults.

## Project Architecture

This is a fullstack JavaScript project with the following structure:
- `allinone/`: Frontend application built with React, Vite, and React Router.
- `api/`: Backend server built with Express, following a Service-Oriented MVC pattern.
  - `routes/`: Express router modules defining API endpoints.
  - `controllers/`: Request and response handlers for API logic.
  - `services/`: Business logic and external API integrations (e.g., Google Drive, Prisma).
  - `config/`: Configuration files and API credentials.
  - `prisma/`: Prisma schema and migration files for PostgreSQL.
  - `scripts/`: Utility and setup scripts (e.g., token generation, database sync).
  - `logs/`: Application and process logs.
  - `uploads/`: Directory dedicated strictly for test data files.

## Development Workflow

### Frontend (`allinone/`)
- **Framework:** React 19+
- **Styling:** CSS modules or plain CSS are preferred. Always ensure the frontend is responsive across different screen sizes.
- **Design System (Apple UI/UX):** Strictly follow Apple's Human Interface Guidelines (HIG).
  - **Typography:** Use the **San Francisco (SF Pro)** font stack (`-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`, `SF Pro Display`).
  - **Aesthetics:** Utilize "glassmorphism" (`backdrop-filter: blur(20px)`), subtle translucent borders, soft drop shadows, and high-contrast text.
  - **Layout:** Minimalist, generous whitespace, and large rounded corners (e.g., `border-radius: 12px` to `20px`).
  - **Interaction:** Ensure fluid, smooth transitions for hover states, buttons, and modals.
  - **Themes:** Supports Light and Dark modes via `ThemeContext.jsx` and `data-theme` attribute on the `html` element.
- **Linting:** Use `npm run lint` within the `allinone/` directory to verify code quality.
- **Commands:** Use `npm run dev` for local development and `npm run build` for production builds.

### Backend (`api/`)
- **Framework:** Express
- **Database:** PostgreSQL managed by Prisma ORM.
- **File Handling:** Uses `busboy` for streaming file uploads directly to Google Drive (no local storage).
- **Integrations:** Google Drive API via `googleapis`.
- **Security:** Never commit or expose `google.json` or related credential files.
- **api/uploads/:** Only test files store here.
- **Syncing:** Periodic or manual synchronization between Google Drive and the local database via `api/scripts/sync-drive.js`.

## Core Feature Architectures

### 1. Upload & Storage
- **Frontend Components:** 
  - `allinone/src/pages/Upload.jsx`: Uses `FormData` to send files to the `/upload` endpoint.
  - `allinone/src/pages/Documents.jsx`: Lists non-image files.
  - `allinone/src/pages/Gallery.jsx`: Lists image files in a responsive grid.
- **Backend Flow:**
  - `api/routes/fileRoutes.js`: Defines routes for uploading, listing, and tagging files (all protected by `authenticateToken`).
  - `api/controllers/fileController.js`: Orchestrates the upload to Drive and then caches metadata in the database.
  - `api/services/googleDriveService.js`: Encapsulates `busboy` streaming and `googleapis` logic.
  - `api/services/fileService.js`: Handles database operations for file metadata and tags.
- **Validation:** Server-side `busboy` stream validation checks `mimeType` and `fileSize` (max 20MB) before processing.

### 2. Database Layer (Prisma)
- **Schema:** `api/prisma/schema.prisma`
- **Models:**
  - `File`: Stores Google Drive file metadata (`driveFileId`, `name`, `mimeType`, `webViewLink`, `thumbnailLink`, `size`).
  - `User`: Stores user credentials (`email`, `password` hashed, `role`, `name`).
  - `Tag`: Supports categorizing files with many-to-many relationship to `File`.
  - `DriveConfig`: Stores encrypted Google Drive API credentials and the target `folderId`.
- **Service:** `api/services/prismaService.js` (Singleton instance of PrismaClient).

### 3. Configuration & Authentication
- **Settings:** Managed via `allinone/src/pages/Settings.jsx` (Admin only).
- **Authentication:**
  - **Frontend:** `allinone/src/AuthContext.jsx` manages JWT token, login/logout, and user session.
  - **Backend:** `api/middleware/authMiddleware.js` provides `authenticateToken` and `isAdmin` checks.
  - **Routes:** `api/routes/userRoutes.js` handles login and registration.
  - **Access Control:** `Documents` and `Gallery` are publicly accessible (read-only). `Upload` requires authentication (`AuthenticatedRoute`). `Settings` requires admin privileges (`AdminRoute`).
- **OAuth Flow:**
  - `api/routes/authRoutes.js` and `api/controllers/authController.js` handle the OAuth2 flow to obtain refresh tokens.
- **Service:** `api/services/configService.js` manages configuration retrieval and encryption/decryption of secrets.

## Mandatory Guidelines

1. **Environment Variables:** Always use `.env` files for configuration. Do not hardcode API keys or secrets. Requires `JWT_SECRET` for authentication.
2. **Code Style:** Adhere to the existing ESLint configuration in `allinone/`. Use `useMemo` for derived state in Contexts to avoid cascading renders.
3. **Responsiveness:** All frontend components and layouts MUST be responsive and functional on mobile, tablet, and desktop devices.
4. **UX/UI:** 
   - Always have a spinner when an API is running.
   - Use the `.glass` utility class for glassmorphism effects.
   - All file/gallery access requires being logged in.
5. **Security:**
   - Protect credentials in the `api/` directory.
   - Validate file uploads (type, size) before processing.
   - Encrypt sensitive data in the database (e.g., `clientSecret`, `refreshToken`).
6. **Tool Usage:**
   - Always run linting commands after modifying frontend code.
   - Verify backend changes by testing the Express endpoints (e.g., using `curl` or temporary test scripts).
   - Use `npx prisma generate` after changing `schema.prisma`.
7. **Context Efficiency:**
   - When working on the frontend, focus on the `allinone/` directory.
   - When working on the backend, focus on the `api/` directory.

## Custom Agents

The following custom agents are available in this project:
- **`pm-agent`**: Specialized in requirements gathering, task breakdown, and roadmapping. Located in `.gemini/agents/pm-agent.md`.
- **`code-reviewer`**: Expert for code quality and bug analysis. Located in `.gemini/agents/code-reviewer.md`.
- **`fe-agent`**: Senior Frontend Architect specializing in Apple UI/UX and React 19. Located in `.gemini/agents/fe-agent.md`.
