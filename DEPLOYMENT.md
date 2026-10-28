# 🚀 Production Deployment & Operations Guide
## AI-Powered Water Crisis Prediction & Management Platform

This runbook covers the live production deployment on **Render.com**, containerized deployment via **Docker Compose**, and local development configuration.

---

## 🌐 Live Production Links

| Service | Live URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | [water-crisis-platform-frontend.onrender.com](https://water-crisis-platform-frontend.onrender.com) | React 18 production client |
| **Backend API** | [water-crisis-prediction-platform-1.onrender.com](https://water-crisis-prediction-platform-1.onrender.com) | FastAPI REST service |
| **Interactive API Docs** | [Backend Swagger UI](https://water-crisis-prediction-platform-1.onrender.com/docs) | OpenAPI interactive documentation |
| **ReDoc Documentation** | [Backend ReDoc](https://water-crisis-prediction-platform-1.onrender.com/redoc) | Alternative structured API docs |
| **Health Check** | [API Health Endpoint](https://water-crisis-prediction-platform-1.onrender.com/health) | Uptime and heartbeat monitor |

**Demo Login**:
- **Email**: `admin@water.gov`
- **Password**: `Admin@123`

---

## 1. Cloud Deployment (Render.com)

The project includes a ready-to-use [`render.yaml`](./render.yaml) blueprint that configures both services automatically.

### Architecture on Render:
- **Web Service (`water-crisis-prediction-platform`)**:
  - Runtime: Python 3.11
  - Build Command: `pip install -r backend/requirements.txt`
  - Start Command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Static Site (`water-crisis-platform-frontend`)**:
  - Runtime: Node.js 18+
  - Build Command: `cd frontend && npm install && npm run build`
  - Publish Directory: `frontend/dist`
  - Rewrite Rule: `/* -> /index.html` (SPA routing)

---

### Environment Variables Matrix

#### Backend Web Service (`Render`):
| Variable | Value / Format | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...` or `sqlite:///./water_crisis.db` | Main relational database |
| `JWT_SECRET_KEY` | `64-character random hex string` | Signs authentication tokens |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Access token lifespan |
| `CORS_ORIGINS` | `https://water-crisis-platform-frontend.onrender.com,http://localhost:5173` | Allowed origins |
| `DEBUG` | `False` | Disables debug stack traces in production |
| `GROQ_API_KEY` | *(Optional)* `gsk_...` | Enables free ultra-fast Llama 3.3 70B AI chat |
| `GEMINI_API_KEY` | *(Optional)* `AIzaSy...` | Enables Google Gemini 1.5 Flash AI chat |
| `OPENAI_API_KEY` | *(Optional)* `sk-...` | Enables OpenAI GPT-4o-mini AI chat |

#### Frontend Static Site (`Render`):
| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://water-crisis-prediction-platform-1.onrender.com/api/v1` | Backend API base URL |

---

## 2. Docker & Multi-Container Deployment

To deploy on a Virtual Private Server (AWS EC2, DigitalOcean Droplet, Linode) using Docker Compose:

```bash
# 1. Clone repository
git clone https://github.com/krishnasundari/water-crisis-prediction-platform.git
cd water-crisis-prediction-platform

# 2. Configure environment file
cp backend/.env.example backend/.env

# 3. Build and launch all containers
docker-compose up --build -d

# 4. Check container health
docker-compose ps
```

This boots:
- **Frontend**: Nginx-served static React bundle on port `80`/`443`
- **Backend**: FastAPI with Gunicorn workers on port `8000`
- **PostgreSQL**: Relational database on port `5432`
- **Redis**: Caching service on port `6379`

---

## 3. Local Development Setup

### Backend:
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
Backend runs at `http://localhost:8000`.

### Frontend:
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## 4. Operational Runbooks & Health Verification

### Verifying Service Heartbeat:
```bash
curl -i https://water-crisis-prediction-platform-1.onrender.com/health
```
Expected output:
```json
{"status":"healthy","version":"1.0.0","debug":false}
```

### Triggering Manual Ingestion Sync (Admin):
```bash
curl -X POST https://water-crisis-prediction-platform-1.onrender.com/api/v1/sync/run \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

### Running Automated Test Suite:
```bash
# Backend pytest suite (133 tests)
cd backend
python -m pytest

# Frontend vitest suite (11 tests)
cd frontend
npm run test
```
