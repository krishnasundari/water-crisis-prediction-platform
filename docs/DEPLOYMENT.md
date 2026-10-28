# Deployment Guide & Production Operations

This document provides complete instructions for local setup, environment configuration, database migration from ephemeral SQLite to persistent PostgreSQL, Render deployment procedures, health monitoring, and rollback operations.

---

## 1. Architecture & Infrastructure Topology

```
                  ┌──────────────────────────────────────────┐
                  │          Render Cloud Platform           │
                  │                                          │
   HTTPS User ───►│  [ Static Site Service ]                 │
   (Browser)      │  water-crisis-platform-frontend          │
                  │  (Vite React Single Page Application)    │
                  │                     │                    │
                  │                     ▼ REST API / WebSocket
                  │  [ Docker Web Service ]                  │
                  │  water-crisis-prediction-platform-1      │
                  │  (Gunicorn 2x Uvicorn Workers)           │
                  │         │                      │         │
                  │         ▼                      ▼         │
                  │  [ PostgreSQL DB ]     [ sync_locks ]    │
                  │  (Persistent Target)   (Atomic Locking)  │
                  └──────────────────────────────────────────┘
```

* **Backend Service**: Render Web Service (`water-crisis-prediction-platform-1`)
  * Runtime: Docker (`backend/Dockerfile`)
  * Server: Gunicorn with Uvicorn worker class (`gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120`)
* **Frontend Service**: Render Static Site (`water-crisis-platform-frontend`)
  * Build Command: `npm install && npm run build`
  * Publish Directory: `dist`
* **Orchestration**: `render.yaml` specification in repository root.

---

## 2. Environment Variables Specification

The table below lists all required and optional environment variables. **Never commit production secrets or `.env` files to source control.**

| Variable Name | Required | Default / Local | Production Recommendation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | `sqlite:///./water_crisis.db` | `postgresql+psycopg2://user:pass@dpg-xxx:5432/dbname` | Database connection URI. Must be PostgreSQL in production to avoid ephemeral filesystem data loss. |
| `JWT_SECRET_KEY` | **Yes** | Local dev fallback | `openssl rand -hex 32` | 256-bit cryptographic secret for signing authentication tokens. |
| `JWT_ALGORITHM` | No | `HS256` | `HS256` | Encryption algorithm for JWT tokens. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `30` | `30` | Lifespan of short-lived JWT access tokens. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | `7` | Lifespan of refresh tokens stored securely. |
| `GOOGLE_CLIENT_ID` | Optional | `""` | Provided by Google Cloud Console | Client ID for Google OAuth2 SSO verification. |
| `GEMINI_API_KEY` | Optional | `""` | Provided by Google AI Studio | API key for Gemini LLM synthesis in AI Assistant. |
| `CORS_ORIGINS` | No | `["http://localhost:5173", "http://localhost:3000"]` | `["https://water-crisis-platform-frontend.onrender.com"]` | Authorized frontend origins permitted to make cross-origin requests. |
| `PORT` | Auto | `8000` | Injected dynamically by Render | Application HTTP bind port. |
| `DEBUG` | No | `True` | `False` | Disables debug mode and Swagger schema editing in production. |

---

## 3. Local Development Setup

### 3.1 Backend Setup
1. **Navigate to the Backend Directory**:
   ```bash
   cd backend
   ```
2. **Create and Activate a Virtual Environment**:
   ```bash
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Initialize Database & Seed Data**:
   ```bash
   # Runs auto-migrations and seeds default roles and admin
   python -c "from app.main import run_schema_migrations; run_schema_migrations()"
   ```
5. **Run the Development Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### 3.2 Frontend Setup
1. **Navigate to the Frontend Directory**:
   ```bash
   cd frontend
   ```
2. **Install Node Packages**:
   ```bash
   npm install
   ```
3. **Configure Local Environment**:
   Create a `.env.local` file:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
4. **Start the Vite Development Server**:
   ```bash
   npm run dev
   ```

---

## 4. Database Migration: Ephemeral SQLite to Render PostgreSQL

Render's default free-tier container filesystem is ephemeral; changes written to a local SQLite file (`water_crisis.db`) are wiped whenever the service restarts, redeploys, or scales.

### Step-by-Step PostgreSQL Provisioning
1. **Provision Render PostgreSQL**:
   * In the Render Dashboard, click **New +** $\to$ **PostgreSQL**.
   * Name: `water-crisis-db`.
   * Plan: Free / Starter.
   * Copy the **Internal Database URL** (e.g., `postgres://user:password@dpg-xxx-a:5432/water_crisis_db`).
2. **Update Backend Environment Variables on Render**:
   * Set `DATABASE_URL` to the copied internal connection string.
   * *Note*: If the URL starts with `postgres://`, SQLAlchemy 2.0 requires `postgresql://` or `postgresql+psycopg2://`. The backend `config.py` automatically normalizes `postgres://` to `postgresql://`.
3. **Schema Initialization**:
   * On container startup, `app.main:app` runs `Base.metadata.create_all(bind=engine)`, creating all tables natively on the PostgreSQL instance.
   * `run_schema_migrations()` validates and creates all composite indices non-destructively.
   * `seed_database()` populates initial roles (`admin`, `official`, `analyst`, `citizen`) and creates the initial administrator user if absent.
4. **Run Data Sync**:
   * Within 10 seconds of startup, the background scheduler runs the initial data synchronization, ingesting CWC bulletins, Open-Meteo weather, and GDACS alerts directly into the persistent PostgreSQL database.

---

## 5. Health Checks & Verification Procedures

### 5.1 Post-Deploy Smoke Test Checklist
1. **Health Probe**:
   ```bash
   curl -s https://water-crisis-prediction-platform-1.onrender.com/health
   # Expected: {"status":"healthy","version":"1.0.0","debug":false}
   ```
2. **Reservoir Data Verification**:
   ```bash
   curl -s https://water-crisis-prediction-platform-1.onrender.com/api/v1/reservoirs | jq '.[0]'
   # Verify presence of 'storage_mcm', 'capacity_mcm', 'last_updated_at', and 'data_source'
   ```
3. **Scheduler Lock Verification**:
   ```bash
   # Check sync lock status
   curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" https://water-crisis-prediction-platform-1.onrender.com/api/v1/admin/sync-status
   ```
4. **Frontend Single-Page Routing**:
   * Visit `https://water-crisis-platform-frontend.onrender.com/` in a browser.
   * Navigate to `/analytics`, `/map`, and `/alerts`. Confirm that refreshing on deep routes returns `index.html` (verified by Render static redirect `/* -> /index.html 200`).

---

## 6. Rollback Procedures

If an anomalous regression occurs following a deployment:
1. **Render Instant Rollback**:
   * Navigate to the Render Dashboard for `water-crisis-prediction-platform-1`.
   * Click **Events** or **Deploys**.
   * Locate the last known healthy deployment commit.
   * Click the action menu and select **Rollback to this deploy**.
2. **Database Rollback Safety**:
   * All database migrations in `app.main:app` are additive (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
   * No destructive table drops or column deletions are executed, ensuring backward compatibility with previous code versions.
