# Project Setup & Run Instructions

This project is a fullstack application consisting of a React frontend and an Express backend that integrates with the Google Drive API.

## Project Structure

- `allinone/`: Frontend application (React + Vite).
- `api/`: Backend server (Node.js + Express).

## Prerequisites

- Node.js installed on your machine.
- Google Drive API credentials.
- A Neon Postgres database connection string.

## 1. Backend Setup (`api/`)

The backend securely loads configuration through Environment Variables (`.env`) or a local `google.json` file.

1. Navigate to the backend directory:
   ```bash
   cd api
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Google Drive API and Neon:
   - Copy the example `.env` file to set up your environment variables:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and fill in your OAuth 2.0 credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN`) and `GOOGLE_DRIVE_FOLDER_ID`.
   - Set `DATABASE_URL` and `DIRECT_URL` to your Neon Postgres connection strings.
   - `DATABASE_URL` is used by the running API.
   - `DIRECT_URL` is used by Prisma schema commands.
   - *Alternatively, for local testing, you can place a `google.json` file at `api/config/google.json`.*
4. Initialize the Neon schema:
   ```bash
   npm run build
   ```
   This runs `prisma generate` and `prisma db push` so the required tables exist in Neon.
5. Start the server:
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

   You have two options for running the frontend locally depending on which API you want to test against.

   **Option A: Test against Local Backend (Default)**
   Run this if you have the `api` server running locally on port 3001:
   ```bash
   npm run dev
   ```

   **Option B: Test against Production Backend**
   Run this to connect your local frontend directly to the deployed Render backend (`https://my-work-9b66.onrender.com`):
   ```bash
   npm run dev:prod
   ```

   This will launch the Vite development server (usually on http://localhost:5173).

## 3. Production Deployment & GitHub Configuration

### Frontend (GitHub Pages)
The repository contains a `.github/workflows/deploy.yml` action that automatically builds and deploys your `allinone` React frontend to **GitHub Pages** on every push to the main branch. 
- GitHub Pages only hosts static files, meaning it **cannot** host your `api` backend.
- If your frontend needs to communicate with your deployed backend, you can pass the backend's URL using a GitHub Secret and map it in your workflow to a Vite environment variable (e.g. `VITE_API_URL`).

### Backend (Node.js Server)
Because GitHub Pages only supports static hosting, the Node.js `api` server must be deployed to a separate hosting provider such as Render, Railway, Heroku, or a VPS.
- **Configuring Secrets:** When you deploy the backend to your chosen hosting provider, DO NOT commit your `.env` or `google.json` files to GitHub. 
- Go to the Environment Variables (or Config Vars) section of your hosting provider's dashboard and provide your `DATABASE_URL`, `DIRECT_URL`, and `ENCRYPTION_KEY`.
- Google Drive credentials will be managed through the application's own settings interface once deployed.

## Additional Information

- **Linting (Frontend):** You can verify the frontend code quality by running `npm run lint` in the `allinone/` directory.
- **Security:** Do not commit your `google.json` or any `.env` files containing sensitive credentials to version control. The `.gitignore` has been updated to prevent this.
revent this.
