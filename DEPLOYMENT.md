# Deployment Guide

This guide details how to deploy the AI Code Review platform to a production environment. The recommended stack for a portfolio project is:
- **Frontend**: Vercel
- **Backend**: Railway or Render
- **Database**: PostgreSQL (via Supabase or Railway)

---

## 1. Database (PostgreSQL)

The application requires a PostgreSQL database for production.

**Option A: Supabase**
1. Create a new project on [Supabase](https://supabase.com).
2. Go to Project Settings -> Database to find your Connection URI.
3. Ensure you use the connection pooling URL (usually port 6543) if you expect high concurrent connections.

**Option B: Railway**
1. Create a new project on [Railway](https://railway.app).
2. Click "Provision PostgreSQL".
3. Retrieve the `DATABASE_URL` from the "Connect" tab.

---

## 2. Backend (Railway or Render)

The backend is a FastAPI application that requires environment variables to connect to the database and AI providers.

### Deploying to Railway
1. Push your code to a GitHub repository.
2. In Railway, click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository. If you have a monorepo, set the **Root Directory** to `/backend`.
4. Railway will automatically detect the `Dockerfile` and build the image.
5. Go to the **Variables** tab and add the required environment variables:
   - `DATABASE_URL`: `postgresql://user:password@hostname:5432/dbname`
   - `GEMINI_API_KEY`: `your-gemini-key`
   - `SECRET_KEY`: Generate via `openssl rand -hex 32`
   - `CORS_ORIGINS`: `["https://your-frontend.vercel.app"]`
6. The `Dockerfile` includes `alembic upgrade head`, so migrations will run automatically on startup.

### Deploying to Render
1. Create a **New Web Service** on Render.
2. Select your GitHub repository.
3. Set the **Root Directory** to `backend`.
4. Render will detect the `Dockerfile`.
5. Under **Advanced**, add the environment variables listed above.

---

## 3. Frontend (Vercel)

The frontend is a React application built with Vite.

### Deploying to Vercel
1. Create a new project on [Vercel](https://vercel.com).
2. Import your GitHub repository.
3. Edit the **Framework Preset** to Vite.
4. Set the **Root Directory** to `frontend`.
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://your-backend-app.up.railway.app/api`
6. Click **Deploy**.

Vercel will automatically build the assets and configure routing using the settings inside `vite.config.ts`.

---

## Local Deployment with Docker Compose

To test the entire production stack locally:

1. Copy `backend/.env.example` to `backend/.env` and fill in your AI API key.
2. Run the following command from the root of the project:
   ```bash
   docker-compose up --build
   ```
3. The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:8000`.
