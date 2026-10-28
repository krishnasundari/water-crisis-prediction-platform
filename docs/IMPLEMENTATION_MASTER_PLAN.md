# Implementation Master Plan
## AI-Powered Water Crisis & Disaster Intelligence Platform

**Audit conducted:** 2026-10-26  
**Auditor:** Automated code inspection (read-only, no files modified)  
**Repository:** https://github.com/krishnasundari/water-crisis-prediction-platform  
**Branch:** `main` | **Latest commit at audit:** `4fc953e`

---

## A. Existing Architecture

```
water-crisis-platform/
├── backend/                        FastAPI Python service
│   ├── app/
│   │   ├── api/routes/             14 route modules
│   │   ├── core/config.py          Pydantic settings (env-driven)
│   │   ├── db/database.py          SQLAlchemy + SQLite engine
│   │   ├── db/seed.py              Seed: 3 roles, 1 admin, 13 dams, 3 villages, 3 rivers
│   │   ├── ml/models/predictor.py  Water crisis + flood risk predictor
│   │   ├── ml/models/train_model.py RandomForest trainer (synthetic data)
│   │   ├── models/models.py        15 SQLAlchemy ORM models
│   │   ├── providers/              DamProvider, RiverProvider, AlertProvider
│   │   ├── services/               auth, sync, weather, email, notification
│   │   └── main.py                 FastAPI app, CORS, lifespan, 14 routers
│   ├── tests/test_auth_upgrade.py  1 test file (broken — see below)
│   ├── requirements.txt            43 pinned dependencies
│   ├── Dockerfile                  Python 3.11-slim, gunicorn via start.sh
│   └── start.sh                    PORT fallback entrypoint
├── frontend/                       Vite + React 18 + TypeScript
│   ├── src/pages/                  17 page components
│   ├── src/components/             Sidebar, Maps, Auth components
│   ├── src/services/api.ts         Fetch-based API client
│   └── src/store/                  Zustand state (if any)
├── .gitattributes                  LF line-ending enforcement
├── .gitignore                      Excludes venv, node_modules, *.db, .env
└── docs/                           This documentation (new)
```

**Tech stack:**  
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, Leaflet maps, Zustand  
- Backend: FastAPI 0.104, SQLAlchemy 2.0, SQLite (production), bcrypt, python-jose JWT  
- ML: scikit-learn RandomForestClassifier, numpy/pandas, joblib  
- AI: Pollinations.AI (free keyless LLM), keyword-matched DB queries  
- Deployment: Render (frontend = Static Site, backend = Docker Web Service)

---

## B. Feature-Status Table

| # | Feature | Status | Evidence / File |
|---|---------|--------|----------------|
| 1 | Email + password login | **VERIFIED** | `auth.py:176`, confirmed working with `admin@water.gov` / `Admin@123` |
| 2 | User registration (Create Account) | **IMPLEMENTED BUT NOT VERIFIED** | `auth.py:33`, `auth_service.py:96` — no integration test run |
| 3 | Google OAuth login | **PARTIALLY IMPLEMENTED** | `auth.py:56` verifies token via `google-auth`; `GOOGLE_CLIENT_ID` hardcoded in `config.py:33`; `GOOGLE_CLIENT_SECRET` not used server-side (correct); untested on production |
| 4 | JWT access + refresh tokens | **IMPLEMENTED BUT NOT VERIFIED** | `auth_service.py:28-45`, 15-min access / 7-day refresh; no automated test |
| 5 | Forgot password / OTP reset | **PARTIALLY IMPLEMENTED** | OTP generated, stored in DB (`auth.py:107`); SMTP not configured → OTP only in server logs, never emailed to user |
| 6 | Dashboard overview | **IMPLEMENTED BUT NOT VERIFIED** | `dashboard.py` route exists; frontend `DashboardPage.tsx`; no test |
| 7 | Reservoir/dam monitoring (13 dams) | **PARTIALLY IMPLEMENTED** | 13 dams seeded (`seed.py:47-169`); Open-Meteo rainfall = live; Srisailam level hardcoded static 322.45 labeled "Live CWC"; other 12 dams = formula-estimated |
| 8 | River monitoring (Ganges, Yamuna, Godavari) | **PARTIALLY IMPLEMENTED** | 3 rivers seeded; Ganges hardcoded static 8.45m labeled "Live CWC"; Yamuna/Godavari = simulated |
| 9 | Live weather data (Open-Meteo) | **IMPLEMENTED BUT NOT VERIFIED** | `sync_service.py:39-53`, `sync_service.py:118-145` — real API calls to `api.open-meteo.com`; no integration test |
| 10 | Background sync every 15 minutes | **IMPLEMENTED BUT NOT VERIFIED** | `main.py:105-122` — asyncio loop; SQLite resets on Render redeploy so history is lost |
| 11 | ML water crisis prediction | **PARTIALLY IMPLEMENTED** | `predictor.py:29-84`; `model.pkl`+`scaler.pkl` are git-tracked and deployed; model trained on 5,000 **synthetic** rows (`train_model.py`) — not validated on real data |
| 12 | ML flood prediction | **MOCKED OR SIMULATED** | `predictor.py:88-141` — pure weighted arithmetic formula, no trained ML model |
| 13 | Automated alerts engine | **PARTIALLY IMPLEMENTED** | Rule-based conditions in `sync_service.py:265-315`; duplicate-per-day guard exists; alert records saved to DB |
| 14 | GDACS official disaster feed | **IMPLEMENTED BUT NOT VERIFIED** | `alert_provider.py:15` — real HTTP GET to GDACS XML; India filter applied; falls back to hardcoded IMD string if feed empty or blocked |
| 15 | Notification dispatch | **MOCKED OR SIMULATED** | `notification_service.py` — logs SMS/Email as "delivered" with fake stakeholder names (Ramesh Patel, S.K. Verma); no real SMS or email sent |
| 16 | AI assistant — DB queries | **IMPLEMENTED BUT NOT VERIFIED** | `ai_assistant.py:33-217` — keyword routing to real DB queries; rivers, dams, villages, predictions |
| 17 | AI assistant — general LLM | **IMPLEMENTED BUT NOT VERIFIED** | `ai_assistant.py:237` — Pollinations.AI `text.pollinations.ai`; no API key required; 8s timeout |
| 18 | AI conversation history | **IMPLEMENTED BUT NOT VERIFIED** | `AIConversation` model; `ai_assistant.py:264-276`; no auth guard on chat endpoint |
| 19 | Interactive maps (Leaflet) | **IMPLEMENTED BUT NOT VERIFIED** | `MapView.tsx`, `MapsPage.tsx`; seeded coordinates; no test |
| 20 | WebSocket real-time broadcast | **IMPLEMENTED BUT NOT VERIFIED** | `websocket_manager.py`, `websocket.py`; broadcast at end of every sync cycle |
| 21 | Analytics & reports | **PARTIALLY IMPLEMENTED** | `analytics.py`, `reports.py` routes exist; `report_generator.py` with ReportLab; no confirmed working test |
| 22 | Evacuation routing | **PARTIALLY IMPLEMENTED** | `evacuation.py` route exists; frontend `DisasterPage.tsx`; implementation depth not verified |
| 23 | Village monitoring | **IMPLEMENTED BUT NOT VERIFIED** | `villages.py`, `VillagesPage.tsx`; 3 seeded villages |
| 24 | Groundwater tracking | **MOCKED OR SIMULATED** | `sync_service.py:182-199` — formula: `depth = depth + 0.02 - (rain × 0.05)`; no real sensor data |
| 25 | Forgot password email delivery | **MISSING OR BROKEN** | `email_service.py:37` — falls back to console print if SMTP not configured; no SMTP_EMAIL/SMTP_PASSWORD set in Render environment |
| 26 | Tests | **PARTIALLY IMPLEMENTED** | `tests/test_auth_upgrade.py` — one test function with `Depends(get_db) if False else None` (invalid, will error); no `conftest.py`; no `pytest.ini`; tests not run in CI |
| 27 | CI/CD pipeline | **MISSING OR BROKEN** | No `.github/workflows/*.yml` at project root; no GitHub Actions |
| 28 | Docker deployment | **VERIFIED** | Backend live on Render via Docker; Docker Command: `gunicorn app.main:app ... --bind 0.0.0.0:10000`; confirmed responding |

---

## C. Data-Source Inventory

| Data Type | Source | Category | Displayed As |
|-----------|--------|----------|-------------|
| Current precipitation (per dam/village) | Open-Meteo `api.open-meteo.com/v1/forecast` | **Live — real API** | "Live" |
| Srisailam dam water level | Hardcoded constant: `322.45` TMC | **Static seed** | ⚠️ "Live" (misleading) |
| All other 12 dam levels | Hydrological formula: `current + rain × 0.35` | **Simulated** | "Estimated" |
| Ganges river level | Hardcoded constant: `8.45 m`, flow `845.0 m³/s` | **Static seed** | ⚠️ "Live" (misleading) |
| Yamuna river | Rain-driven formula | **Simulated** | "Simulated Telemetry" |
| Godavari river | Rain-driven formula | **Simulated** | "Simulated Telemetry" |
| Groundwater depth | Formula: `depth + 0.02 – rain × 0.05` | **Synthetic** | Not labeled |
| Reservoir capacity specs (13 dams) | Published engineering specs (TMC) | **Historical/official** | Static initial values |
| GDACS disaster alerts | `https://www.gdacs.org/xml/gdacs.xml` | **Live — real API** | "GDACS" |
| IMD fallback alert | Hardcoded string | **Static seed** | "India Meteorological Department (IMD)" ⚠️ |
| ML training dataset | `np.random.seed(42)` — 5,000 synthetic rows | **Synthetic** | Not disclosed to user |
| Water crisis predictions | ML model (Random Forest on synthetic data) | **Synthetic/ML** | Presented as predictions |
| Flood risk | Weighted arithmetic formula | **Rule-based** | Presented as ML prediction |
| AI general responses | Pollinations.AI (external LLM) | **Live — external** | AI Assistant |
| AI data responses | SQLite DB queries | **Platform data** | AI Assistant |
| Weather history | Open-Meteo per-sync (saved to `weather_history`) | **Live — real API** | Logged but not exposed to UI directly |

> **⚠️ Data Integrity Warning:**  
> Srisailam dam level (`322.45`) and Ganges river level (`8.45 m`) are hardcoded constants labeled "Live CWC telemetry." These are **not** fetched from any API — they are static values that never change. Displaying them as live measurements is misleading.  
>  
> The IMD fallback alert ("OFFICIAL IMD ALERT: Severe runoff flood hazard warnings issued for Ganges Basin...") is a hardcoded string returned whenever GDACS is unavailable. It will appear repeatedly in the database as if it is a fresh official alert.

---

## D. ML Implementation Assessment

| Item | Finding |
|------|---------|
| Training script | `backend/app/ml/models/train_model.py` |
| Training data | 5,000 rows generated by `np.random.seed(42)` with `np.random.uniform` / `np.random.randint` — **fully synthetic** |
| Label generation | Deterministic rule-based scoring on the synthetic inputs — labels are NOT from real crisis events |
| Model type | `RandomForestClassifier(n_estimators=200, random_state=42)` |
| Features | `rainfall`, `population`, `reservoir_capacity`, `groundwater_level` (4 features) |
| Classes | 0 = Safe, 1 = Moderate, 2 = High |
| Model artifacts | `model.pkl`, `scaler.pkl`, `water_crisis_model.pkl` — git-tracked and deployed |
| Reported accuracy | Printed to stdout during training; **not recorded anywhere**; cannot be verified from audit |
| Real-world validation | **None** — model has never been evaluated on real Indian water crisis data |
| Flood predictor | **No ML model** — pure weighted formula in `predictor.py:88-141` |
| `joblib` dependency | Used in `predictor.py` but not listed in `requirements.txt` (works as sklearn transitive dependency) |
| Model fallback | If pkl files missing → rule-based scoring with different weights than training (`predictor.py:66-83`) |

**Assessment:** The ML component is a demonstration prototype. The Random Forest is trained on synthetic data derived from deterministic rules, which means the model has essentially learned to replicate those rules. It has no real predictive validity for water crisis events.

---

## E. Database and Authentication Assessment

### Database

| Item | Finding |
|------|---------|
| Engine | SQLite via SQLAlchemy 2.0 |
| File location | `./water_crisis.db` (relative to working directory) |
| Production persistence | **CRITICAL RISK:** Render free tier uses ephemeral disk. Every redeploy wipes the database. All predictions, alerts, weather history, and conversation logs are lost. |
| Migrations | Manual `ALTER TABLE` calls in `main.py:21-93` (not Alembic) |
| Seeding | `seed.py` runs on every startup; idempotent (checks count before inserting) |
| Models | 15 tables: roles, users, villages, reservoirs, rainfall_records, groundwater_records, predictions, forecasts, alerts, reports, ai_conversations, password_reset_otps, weather_history, reservoir_history, river_history, notification_logs, rivers |
| Missing index | No composite indexes on time-series tables (e.g., `(village_id, prediction_date)`) |

### Authentication

| Item | Finding |
|------|---------|
| Password hashing | bcrypt via `bcrypt==3.2.2` — correct |
| JWT library | `python-jose[cryptography]` — HS256 algorithm |
| Default JWT secret | `"your-super-secret-key-change-in-production"` in `config.py` — **overridden by Render env var** |
| Token expiry | Access: 15 min, Refresh: 7 days |
| Google OAuth | `google-auth` library verifies ID token server-side — correct approach |
| CORS | `allow_origins=["*"]` — open to all origins |
| Auth guard on AI chat | `/api/v1/ai/chat` — **no authentication required** |
| SMTP / Email OTP | Not configured in production; OTP printed to server logs only |

---

## F. Deployment Assessment

See `docs/DEPLOYMENT_BASELINE.md` for full deployment configuration details.

**Summary:**

| Service | Provider | Type | Status |
|---------|----------|------|--------|
| Frontend | Render | Static Site | ✅ Live |
| Backend | Render | Docker Web Service | ✅ Live |
| Database | SQLite (ephemeral) | In-container file | ⚠️ Volatile |
| CI/CD | None | — | ❌ Not configured |
| Health checks | None | — | ❌ Not configured |

---

## G. Broken Integrations and Technical Risks

| Risk | Severity | Detail |
|------|----------|--------|
| SQLite volatile on Render | 🔴 Critical | Database wiped on every redeploy. No persistence. |
| Hardcoded "Live" data | 🔴 Critical | Srisailam (322.45) and Ganges (8.45m) are static constants presented as live telemetry. |
| ML trained on synthetic data | 🟠 High | Model has no real-world validity. Risk scores are outputs of a formula, not learned patterns. |
| OTP email never delivered | 🟠 High | Forgot Password flow fails silently. SMTP not configured. OTP only in server logs (inaccessible to users). |
| Notification system is fake | 🟠 High | SMS/Email logged as "delivered" with hardcoded fictional contacts. No real dispatch occurs. |
| IMD fallback alert repeats | 🟠 High | Hardcoded IMD alert re-inserted every sync cycle when GDACS is unavailable (daily dedup guard helps but only partial) |
| No auth on AI chat | 🟡 Medium | Any unauthenticated caller can query `/api/v1/ai/chat` |
| Test file broken | 🟡 Medium | `Depends(get_db) if False else None` — invalid pytest, will error. No conftest.py, no CI to catch it. |
| No CI/CD pipeline | 🟡 Medium | No automated tests, linting, or build validation on push |
| JWT secret in config.py | 🟡 Medium | Default weak secret in code; must be overridden via environment variable (Render env var exists) |
| `joblib` unlisted in requirements.txt | 🟢 Low | Works as scikit-learn transitive dependency; should be explicit |
| `psycopg2-binary` installed but unused | 🟢 Low | PostgreSQL driver installed in Docker but no PostgreSQL database configured |
| `REDIS_URL` configured but Redis unused | 🟢 Low | Settings define Redis URL but nothing imports or uses Redis |
| Untracked files in working tree | 🟢 Low | `resume.tex`, `test_convoy.cpp`, `mockmate_env_templates/` — not committed |

---

## H. Documentation Contradictions

| Claim in Docs | Actual Implementation |
|--------------|----------------------|
| `sync_service.py` docstring: "Fetch CWC/NWIC live levels" | Only Srisailam gets a value (hardcoded `322.45`), all others use formula |
| `sync_service.py` docstring: "Fetch CWC river gauge heights" | Only Ganges gets a value (hardcoded `8.45 m`), others simulated |
| `sync_service.py` docstring: "Sync official disaster warnings from GDACS/NDMA feed" | GDACS is attempted; NDMA is never queried. IMD fallback is a static string |
| `dam_provider.py:7` provider name: "National Water Informatics Centre (NWIC) & CWC" | No real NWIC/CWC API is called. Only Srisailam has a fake "live" value |
| `river_provider.py:7` provider name: "Central Water Commission (CWC) River Gauges" | No real CWC API is called. Only Ganges has a hardcoded value |
| `alert_provider.py` returns alert with `data_source: "India Meteorological Department (IMD)"` | The IMD alert is a hardcoded string fallback, not fetched from IMD |
| `notification_service.py:38` comment: "Simulate SMS & Email carriers logging" | Comment is accurate; UI/API may not make the simulation nature clear to end users |
| `predictor.py` docstring: "Predict water crisis risk using trained ML model" | When `USE_ML_MODEL=True`, the model runs, but it was trained on synthetic data |

---

## I. Recommended Implementation Order

### Priority 1 — Data Integrity (Fix Immediately)

| Task ID | Task | Current Status | Priority |
|---------|------|---------------|----------|
| DI-01 | Replace hardcoded Srisailam/Ganges "live" values with honest labels or real API calls | IMPLEMENTED | 🔴 |
| DI-02 | Replace hardcoded IMD fallback alert with labeled simulation (not "OFFICIAL IMD") | IMPLEMENTED | 🔴 |
| DI-03 | Clearly label all simulated/synthetic data in API responses and UI | MISSING | 🔴 |

### Priority 2 — Critical Infrastructure

| Task ID | Task | Current Status | Priority |
|---------|------|---------------|----------|
| INF-01 | Migrate SQLite to persistent PostgreSQL (Supabase free tier or Render Postgres) | IN PROGRESS | 🔴 |
| INF-02 | Configure SMTP email (Gmail app password) for OTP delivery | PARTIALLY DONE | 🟠 |
| INF-03 | Add authentication guard to `/api/v1/ai/chat` endpoint | MISSING | 🟠 |
| INF-04 | Fix broken test file (conftest.py, remove invalid Depends usage) | BROKEN | 🟠 |

### Priority 3 — Real Data Sources

| Task ID | Task | Current Status | Priority |
|---------|------|---------------|----------|
| DATA-01 | Integrate real CWC API (or India-WRIS) for dam storage levels | IMPLEMENTED | 🟠 |
| DATA-02 | Integrate real CWC river gauge API | MISSING | 🟠 |
| DATA-03 | Collect/use real historical water crisis dataset for ML training | MISSING | 🟠 |
| DATA-04 | Add source + observation + retrieval timestamps to all data responses | PARTIALLY DONE | 🟠 |

### Priority 4 — Testing & CI

| Task ID | Task | Current Status | Priority |
|---------|------|---------------|----------|
| TEST-01 | Create `conftest.py` with test DB fixture | MISSING | 🟡 |
| TEST-02 | Write passing unit tests for auth, predictions, alerts | MISSING | 🟡 |
| TEST-03 | Set up GitHub Actions CI (run pytest on push) | MISSING | 🟡 |
| TEST-04 | Add smoke test (curl /health) to Render health check | MISSING | 🟡 |

### Priority 5 — Features

| Task ID | Task | Current Status | Priority |
|---------|------|---------------|----------|
| FEAT-01 | Real SMS/Email notification dispatch (Twilio/Resend) | MOCKED | 🟡 |
| FEAT-02 | ML model retrained on real dataset with validated metrics | SYNTHETIC | 🟡 |
| FEAT-03 | Alembic migration system instead of raw ALTER TABLE | PARTIAL | 🟡 |
| FEAT-04 | Composite indexes on time-series tables | MISSING | 🟡 |

---

## Workstream Details

### WS-01: Existing Bugs and Integration Fixes

| Task ID | Status | Files | Required Change | Acceptance Criteria |
|---------|--------|-------|----------------|---------------------|
| BUG-01 | IN PROGRESS | `backend/Dockerfile`, `backend/start.sh` | Fix CRLF line endings | Backend starts on Render without PORT error — **VERIFIED 2026-10-25** |
| BUG-02 | NOT STARTED | `backend/tests/test_auth_upgrade.py` | Replace `Depends(get_db) if False else None` with proper pytest fixture | `pytest tests/` passes |
| BUG-03 | NOT STARTED | `backend/app/api/routes/ai_assistant.py` | Add JWT auth dependency to `/chat` endpoint | Unauthenticated requests return 401 |
| BUG-04 | NOT STARTED | `backend/app/services/email_service.py` | Configure SMTP env vars in Render | OTP email delivered to user's inbox |

### WS-02: Official Data-Source Verification

| Task ID | Status | Evidence Required |
|---------|--------|------------------|
| DS-01 | NOT STARTED | Verify Open-Meteo response latency and uptime SLA |
| DS-02 | NOT STARTED | Verify GDACS XML feed is reachable from Render Docker |
| DS-03 | NOT STARTED | Identify real CWC/India-WRIS public API endpoints for dam levels |

### WS-15: Authentication and Security

| Task ID | Status | Files | Required Change | Acceptance Criteria | Tests |
|---------|--------|-------|----------------|---------------------|-------|
| AUTH-01 | VERIFIED | `backend/app/services/auth_service.py` | — | Login working with admin@water.gov / Admin@123 | Manual confirm |
| AUTH-02 | NOT STARTED | `backend/app/api/routes/auth.py` | Test register endpoint via API | POST /register returns 201 | `test_auth_upgrade.py` (after fix) |
| AUTH-03 | PARTIALLY IMPLEMENTED | `backend/app/api/routes/auth.py:56` | Test Google OAuth on production | Google Sign-In flow completes | Manual test |
| AUTH-04 | MISSING OR BROKEN | `backend/app/services/email_service.py` | Set SMTP_EMAIL + SMTP_PASSWORD env vars | Forgot password email received in inbox | Manual test |

### WS-17: Deployment

| Task ID | Status | Files | Required Change | Acceptance Criteria |
|---------|--------|-------|----------------|---------------------|
| DEP-01 | VERIFIED | `backend/Dockerfile`, Render settings | Hardcoded port 10000 in Docker Command | `/health` returns 200 — **VERIFIED 2026-10-25** |
| DEP-02 | NOT STARTED | Render environment | Add PostgreSQL database | DB survives redeploy |
| DEP-03 | NOT STARTED | `.github/workflows/ci.yml` | Create GitHub Actions CI | Tests run on every push to main |
| DEP-04 | NOT STARTED | Render service settings | Configure health check path `/health` | Render reports healthy status automatically |

---

## Strict Requirements

1. **Never present synthetic values as official measurements.** The Srisailam (322.45 TMC) and Ganges (8.45 m) values must not be labeled "Live CWC telemetry."
2. **Track source, observation, and retrieval timestamps.** All data stored must carry `data_source`, `data_status`, and `last_updated_at`.
3. **Distinguish observations, forecasts, warnings, and ML predictions.** The current UI does not clearly distinguish these categories.
4. **Preserve historical data.** Migrate away from ephemeral SQLite to PostgreSQL before accumulating any meaningful historical dataset.
5. **Flag stale or missing data.** If a sync fails, data older than 2 hours should be marked "stale" in API responses.
6. **Do not invent model metrics.** The `train_model.py` prints accuracy to stdout only. No metrics are stored or displayed. Until real data is used, do not quote accuracy figures in the UI or README.
7. **Do not claim untested functionality works.** Auth flow (register, Google OAuth, forgot password) is coded but only email login has been manually confirmed.
