# GEMINI.md - Project Mandates

This file contains foundational mandates for the Gemini CLI agent when working in this workspace. These instructions take absolute precedence over general workflows and tool defaults.

## Project Architecture

This is a fullstack JavaScript project with the following structure:
- `allinone/`: Frontend application built with React, Vite, and React Router.
- `api/`: Backend server built with Express, following a Service-Oriented MVC pattern.
  - `routes/`: Express router modules defining API endpoints.
  - `controllers/`: Request and response handlers for API logic.
  - `services/`: Business logic and external API integrations (e.g., Google Drive).
  - `config/`: Configuration files and API credentials.
  - `scripts/`: Utility and setup scripts (e.g., token generation).
  - `logs/`: Application and process logs.
  - `uploads/`: Directory dedicated strictly for test data files.

## Development Workflow

## Frontend (`allinone/`)
- **Framework:** React 19+
- **Styling:** CSS modules or plain CSS are preferred. Always ensure the frontend is responsive across different screen sizes.
- **Design System (Apple UI/UX):** Strictly follow Apple's Human Interface Guidelines (HIG).
  - **Typography:** Use the **San Francisco (SF Pro)** font stack.
  - **Aesthetics:** Utilize "glassmorphism" (`backdrop-filter: blur`), subtle translucent borders, soft drop shadows, and high-contrast text.
  - **Layout:** Minimalist, generous whitespace, and large rounded corners (e.g., `border-radius: 12px` to `18px`).
  - **Interaction:** Ensure fluid, smooth transitions for hover states, buttons, and modals.
- **Linting:** Use `npm run lint` within the `allinone/` directory to verify code quality.
- **Commands:** Use `npm run dev` for local development and `npm run build` for production builds.


### Backend (`api/`)
- **Framework:** Express
- **File Handling:** Uses `busboy` for streaming file uploads directly to Google Drive (no local storage).
- **Integrations:** Google Drive API via `googleapis`.
- **Security:** Never commit or expose `google.json` or related credential files.
- **api/uploads/:** Only test files store here.

## Upload Function Architecture

### Implementation Details
- **Frontend Component:** `allinone/src/pages/Upload.jsx`
  - Uses `FormData` to send files to the `/upload` endpoint.
  - Features: Client-side file type filtering (`accept` attribute), upload progress state, and direct response handling (using `webViewLink`).
- **Backend Architecture:** Service-Oriented MVC
  - **Router:** `api/routes/fileRoutes.js` (defines `POST /upload`).
  - **Controller:** `api/controllers/fileController.js` (handles request/response logic).
  - **Service:** `api/services/googleDriveService.js` (encapsulates `busboy` streaming and `googleapis` logic).
  - **Storage:** Files are streamed directly to the folder specified by `driveFolderId`.
  - **Response Data:** Returns JSON with `id`, `name`, and `webViewLink`.

### File Validation Rules
- **Allowed MIME Types:** `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `application/pdf`, `text/plain`.
- **Validation Layers:**
  - **Client-side:** UI restricts file selection via the `accept` attribute.
  - **Server-side:** `busboy` stream validation checks `mimeType` before processing.

## Mandatory Guidelines

1. **Environment Variables:** Always use `.env` files for configuration. Do not hardcode API keys or secrets.
2. **Code Style:** Adhere to the existing ESLint configuration in `allinone/`.
3. **Responsiveness:** All frontend components and layouts MUST be responsive and functional on mobile, tablet, and desktop devices.
4. **UX/UI:** Always have a spinner when an API is running.
5. **Security:**
   - Protect credentials in the `api/` directory.
   - Validate file uploads (type, size) before processing.
4. **Tool Usage:**
   - Always run linting commands after modifying frontend code.
   - Verify backend changes by testing the Express endpoints (e.g., using `curl` or temporary test scripts).
5. **Context Efficiency:**
   - When working on the frontend, focus on the `allinone/` directory.
   - When working on the backend, focus on the `api/` directory.

## Custom Agents

The following custom agents are available in this project:
- **`pm-agent`**: Specialized in requirements gathering, task breakdown, and roadmapping. Located in `.gemini/agents/pm-agent.md`.
- **`code-reviewer`**: Expert for code quality and bug analysis. Located in `.gemini/agents/code-reviewer.md`.

