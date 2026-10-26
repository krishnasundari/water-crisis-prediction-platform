# Deployment Baseline
## AI-Powered Water Crisis & Disaster Intelligence Platform

**Baseline captured:** 2026-10-26  
**Inspection method:** Read-only code and git audit — no deployment changes made  
**Repository:** https://github.com/krishnasundari/water-crisis-prediction-platform

---

## 1. Git State

| Property | Value |
|----------|-------|
| Current branch | `main` |
| Working-tree status | Clean (committed) — 7 untracked files (not project code) |
| Latest commit | `4fc953e` — "Add .gitattributes to force LF line endings" |
| Configured remote | `origin` → `https://github.com/krishnasundari/water-crisis-prediction-platform.git` |
| Uncommitted application changes | None |
| Untracked files (not committed) | `resume.tex`, `test_convoy.cpp`, `test_xor.cpp`, `frontend/public/dam_background.jpg`, `frontend/public/download_dam.py`, `frontend/public/test_chat.py`, `frontend/public/test_pollinations.py`, `mockmate_env_templates/` |

**Untracked files are preserved and will not be affected by deployment operations.**

### Recent Git History

```
4fc953e  Add .gitattributes to force LF line endings for Dockerfile and shell scripts
27d8770  Fix: rewrite Dockerfile and start.sh with LF line endings to fix CRLF PORT bug
6ab81b4  Use start.sh entrypoint script to reliably handle PORT variable in Docker on Render
e648579  Fix PORT issue: set default PORT=10000 in Dockerfile ENV for Render free tier
6442ef9  Fix Dockerfile: add ENV defaults, fix PORT handling, reduce workers to 1 for free tier
af2bd89  Add Dockerfile for backend Python FastAPI service on Render
db4ac5a  Add render.yaml with correct rootDir, build, and start commands
a77d03d  Fix: add psycopg2-binary back, add SQLite fallback in database.py
f580836  Fix predictor.py: add safe fallback when model.pkl files missing on server
11e6f87  Fix requirements.txt: remove heavy packages that crash Render free tier
```

---

## 2. Hosting Configuration

### Frontend — Render Static Site

| Property | Value |
|----------|-------|
| Service name | `water-crisis-platform-frontend` |
| Provider | Render |
| Service type | Static Site |
| Live URL | https://water-crisis-platform-frontend.onrender.com |
| Status | ✅ **Live and verified** |
| Root directory | `frontend/` |
| Build command | `npm install && npm run build` |
| Publish directory | `dist/` |
| Auto-deploy trigger | On commit to `main` branch of `origin` |
| Environment variables | None required |

### Backend — Render Docker Web Service

| Property | Value |
|----------|-------|
| Service name | `water-crisis-prediction-platform-1` |
| Provider | Render |
| Service type | Web Service (Docker) |
| Live URL | https://water-crisis-prediction-platform-1.onrender.com |
| Status | ✅ **Live and verified** (`/health` returns 200) |
| Root directory | `backend/` |
| Dockerfile path | `backend/Dockerfile` |
| Docker command (override) | `gunicorn app.main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:10000 --timeout 120` |
| Auto-deploy trigger | On commit to `main` branch |
| Internal port | `10000` (hardcoded — Render free tier) |
| Plan | Free tier (spins down after inactivity; first request takes 30–60 s) |

### Backend Environment Variables (Render)

| Variable | Set | Note |
|----------|-----|------|
| `DATABASE_URL` | ✅ | Set to `sqlite:///./water_crisis.db` — ephemeral |
| `JWT_SECRET_KEY` | ✅ | Production-grade secret (value hidden) |
| `GOOGLE_CLIENT_ID` | ✅ | `477358386706-ru8cmef0bgtclpvfhqsrf1fq1ddbc76r.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | ❓ | Not required server-side for ID-token verification; may be set |
| `DEBUG` | ✅ | Set to `False` |
| `ENVIRONMENT` | ✅ | Set (value hidden) |
| `SMTP_EMAIL` | ❌ | **Not configured** — password reset OTP not emailed to users |
| `SMTP_PASSWORD` | ❌ | **Not configured** |
| `PORT` | ❓ | Not explicitly set; hardcoded 10000 in Docker Command bypasses Render's `$PORT` injection |

---

## 3. Deployment Trigger Analysis

| Question | Answer |
|----------|--------|
| Is production on `main` branch? | **Yes** |
| Does Render auto-deploy on push to `main`? | **Yes** — both frontend and backend have Auto-Deploy = "On Commit" |
| Are frontend and backend deployed separately? | **Yes** — two independent Render services |
| Does pushing to `main` deploy both? | **Yes** — both services watch the same repo and branch |
| Is there a staging environment? | **No** |
| Is there a preview/PR environment? | **No** |

> **⚠️ Risk:** Every push to `main` automatically deploys to production with no staging, tests, or approval gate.

---

## 4. CI/CD Pipeline

| Item | Status |
|------|--------|
| GitHub Actions workflows | **None** — no `.github/workflows/` directory at project root |
| Pre-push tests | **None** |
| Linting | **None** |
| Build validation | **None** |
| Smoke tests post-deploy | **None** |
| Rollback mechanism | Manual rollback via Render Dashboard (previous deploy listed) |

---

## 5. Database Configuration

| Item | Status |
|------|--------|
| Engine | SQLite |
| Location | `/app/water_crisis.db` inside Docker container |
| Persistence | **Ephemeral** — wiped on every Render redeploy |
| Backup | **None** |
| Migration tool | Raw `ALTER TABLE` in `main.py:21-93` (not Alembic) |
| Seeding | `seed.py` — runs on every startup; idempotent |
| Real PostgreSQL | **Not configured** |

> **⚠️ Critical:** The SQLite database is lost on every backend redeploy. All accumulated predictions, alerts, weather history, AI conversations, and user accounts (except the seeded admin) are wiped. This makes the platform unsuitable for production data retention.

---

## 6. Health Checks and Smoke Tests

| Item | Status |
|------|--------|
| `/health` endpoint | ✅ Exists — returns `{"status":"healthy","version":"1.0.0","debug":false}` |
| Render health check configured | **Unknown** — not verified in Render Dashboard settings |
| Automated smoke test | **None** |
| Uptime monitoring | **None** |

**Manual verification (2026-10-25):**  
`GET https://water-crisis-prediction-platform-1.onrender.com/health` → HTTP 200 ✅

---

## 7. Google OAuth Configuration

| Item | Status |
|------|--------|
| Google Cloud project | `krishnasundari18@gmail.com` account |
| OAuth Client ID | `477358386706-ru8cmef0bgtclpvfhqsrf1fq1ddbc76r.apps.googleusercontent.com` |
| Authorized JS origins | `http://localhost:5173`, `https://water-crisis-platform-frontend.onrender.com` |
| Authorized redirect URIs | `http://localhost:5173`, `https://water-crisis-platform-frontend.onrender.com`, `https://water-crisis-platform-frontend.onrender.com/login` |
| Server-side verification | Backend verifies ID token via `google.oauth2.id_token.verify_oauth2_token` — correct |
| Google OAuth tested on production | **Not verified** |

---

## 8. Dockerfile (as deployed)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DATABASE_URL=sqlite:///./water_crisis.db
ENV DEBUG=False
ENV JWT_SECRET_KEY=water-crisis-secret-key-production-2024

EXPOSE 10000

CMD ["sh", "/app/start.sh"]
```

**Note:** The `Docker Command` field in Render Settings overrides the `CMD` above with:  
`gunicorn app.main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:10000 --timeout 120`

**Known issue resolved:** CRLF line endings in `start.sh` caused `$PORT` to parse as empty string. Fixed by `.gitattributes` (`*.sh text eol=lf`) in commit `4fc953e` and by hardcoding port `10000` in the Render Docker Command override.

---

## 9. `.gitignore` Coverage

| Pattern | Effect |
|---------|--------|
| `backend/venv/` | Python virtual environment excluded ✅ |
| `*.db` | SQLite database files excluded ✅ |
| `.env`, `.env.*` | Secret files excluded ✅ |
| `frontend/node_modules/` | Node packages excluded ✅ |
| `frontend/dist/` | Build output excluded ✅ |
| `backend/app/ml/models/model.pkl` | **Not excluded** — ML model is committed to GitHub ✅ |
| `backend/app/ml/models/scaler.pkl` | **Not excluded** — Scaler is committed to GitHub ✅ |

---

## 10. Remaining Unknowns

| Unknown | Impact | How to Resolve |
|---------|--------|---------------|
| Whether Render health check path is configured | Medium | Check Render Dashboard → backend service → Settings → Health & Alerts |
| Whether GOOGLE_CLIENT_SECRET is set in Render | Low | Render env tab (not required for token-only flow) |
| Whether Render PostgreSQL add-on is available for free tier | High | Check Render Dashboard → backend service → Add a Database |
| Render Docker build cache behaviour with `.pkl` files | Low | Check deploy logs for pip install duration |
| Whether GDACS XML feed is reachable from Render's network | Medium | Check Render logs after sync cycle (~10 seconds after boot) |
| Actual Render health check interval and failure policy | Low | Render Dashboard → Settings |

---

## 11. Recommended Next Deployment Actions

> **Do not follow these steps until the current configuration is stable.**  
> Current status: Backend is live and healthy. Do not force-push or reset.

| Step | Action | Risk |
|------|--------|------|
| 1 | Add Render Postgres database (free tier) and update `DATABASE_URL` | Low |
| 2 | Configure SMTP_EMAIL and SMTP_PASSWORD in Render environment | Low |
| 3 | Set Render health check to `/health` | Low |
| 4 | Create `.github/workflows/ci.yml` to run pytest before merge | Low |
| 5 | Create a `develop` branch for staging; protect `main` with branch protection rules | Low |
| 6 | Remove `psycopg2-binary` from `requirements.txt` until PostgreSQL is active (or keep for when it is added) | Low |
