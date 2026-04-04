# Project Setup & Run Instructions

This project is a fullstack application consisting of a React frontend and an Express backend that integrates with the Google Drive API.

## Project Structure

- `allinone/`: Frontend application (React + Vite).
- `api/`: Backend server (Node.js + Express).

## Prerequisites

- Node.js installed on your machine.
- Google Drive API credentials.

## 1. Backend Setup (`api/`)

The backend requires a configuration file with your Google Drive API credentials.

1. Navigate to the backend directory:
   ```bash
   cd api
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Google Drive API:
   - Ensure you have your `google.json` configuration file located at `api/config/google.json`.
   - The file should contain your OAuth 2.0 credentials (`client_id`, `client_secret`, `redirectUri`, `refreshToken`) and the `driveFolderId` where files will be uploaded.
4. Start the server:
   ```bash
   node server.js
   ```
   The server will start listening on port 3001.

## 2. Frontend Setup (`allinone/`)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd allinone
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   This will launch the Vite development server (usually on http://localhost:5173).

## Additional Information

- **Linting (Frontend):** You can verify the frontend code quality by running `npm run lint` in the `allinone/` directory.
- **Security:** Do not commit your `google.json` or any `.env` files containing sensitive credentials to version control.
