# 🌊 AI-Powered Water Crisis Prediction & Management Platform

**A Production-Grade Full-Stack Decision-Support Platform for National Water Security and Disaster Mitigation**  
*React 18 + TypeScript + FastAPI + PostgreSQL / SQLite + Scikit-Learn + Multi-LLM AI Assistant*

---

[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=for-the-badge)](https://water-crisis-platform-frontend.onrender.com)
[![Tests](https://img.shields.io/badge/Backend%20Tests-133%20Passed-success?style=for-the-badge&logo=pytest)](https://github.com/krishnasundari/water-crisis-prediction-platform)
[![Frontend Tests](https://img.shields.io/badge/Frontend%20Tests-11%20Passed-success?style=for-the-badge&logo=vitest)](https://github.com/krishnasundari/water-crisis-prediction-platform)
[![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

---

## 🌐 Live Deployed Application

Experience the live system running in production:

| Service | Live URL | Description |
| :--- | :--- | :--- |
| 🌐 **Live Web Application** | [water-crisis-platform-frontend.onrender.com](https://water-crisis-platform-frontend.onrender.com) | Interactive React dashboard, maps, analytics, and AI assistant |
| ⚡ **Interactive API Docs (Swagger UI)** | [Backend Swagger UI](https://water-crisis-prediction-platform-1.onrender.com/docs) | Live OpenAPI test bench & endpoint exploration |
| 📚 **Structured API Docs (ReDoc)** | [Backend ReDoc](https://water-crisis-prediction-platform-1.onrender.com/redoc) | Clean API schema reference |
| 🏥 **Health Check & Heartbeat** | [API Health Endpoint](https://water-crisis-prediction-platform-1.onrender.com/health) | Uptime, heartbeat status, and telemetry monitor |

### 🔐 Demo Credentials
- **Email**: `admin@water.gov`
- **Password**: `Admin@123`
- *(Role: Super Admin with full access to live telemetry, predictive modeling, CWC ingestion, and alert management)*

---

## 📋 Executive Summary & Problem Statement

Water scarcity and sudden monsoon flooding pose dual existential threats to regional stability and public health. Traditional monitoring frameworks suffer from fragmented data sources, delayed weekly bulletins, and a lack of forward-looking predictive modeling.

This platform bridges the gap by providing an end-to-end hydrological decision-support system:
1. **Live Reservoir Telemetry**: Tracks conservation capacities, storage percentages, and depletion velocities across 13 major Indian reservoirs (*Tehri, Bhakra, Hirakud, Sardar Sarovar, Koyna, Mettur, Idukki, etc.*).
2. **Fluvial Flood Monitoring**: Real-time river stages against official danger levels, flow rates ($\text{m}^3/\text{s}$), and GDACS satellite flood surge alerts.
3. **Machine Learning Shortage Forecasting**: A verified 7-day forward storage prediction model ($R^2 = 0.999$, $\text{RMSE} \approx 7.02\text{ MCM}$) using Ridge Regression with strict chronological validation.
4. **Hydrological Vulnerability Index (HVI: 0–100)**: Evaluates civil vulnerability against the Ministry of Jal Shakti benchmark of **135 Litres Per Capita per Day (LPCD)**.
5. **Grounded Conversational AI Assistant**: An intelligent assistant capable of answering user inquiries, querying live telemetry, and providing water-saving guides without hallucination.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 REACT 18 FRONTEND (TypeScript + Vite)                    │
│   Dashboard  │  Geospatial Maps  │  Forecast Visualizer  │  AI Chatbot   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS / REST API
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       FASTAPI BACKEND (Python 3.11)                     │
│   Auth & RBAC  │  Alert Dispatcher  │  Grounded AI Engine  │ Ingestion  │
└──────┬─────────────────────────────┼─────────────────────────────┬──────┘
       │                             │                             │
       ▼                             ▼                             ▼
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│  PostgreSQL  │              │ Scikit-Learn │              │ Multi-LLM    │
│  / SQLite 3  │              │ Ridge Model  │              │ Engine       │
│  (11 Tables) │              │ (R² = 0.999) │              │ Groq/Gemini  │
└──────────────┘              └──────────────┘              └──────────────┘
```

For the comprehensive architectural breakdown, see the **[Architecture Deep-Dive Guide](./ARCHITECTURE.md)**.

---

## 🤖 Machine Learning & Forecasting Models

```mermaid
graph LR
    subgraph Inputs["Telemetry & Climate Features"]
        S["Current Storage (St)"]
        L["Lagged Storage (St-1, St-3, St-7)"]
        D["Drawdown Rate (ΔS 7d)"]
        P["ERA5 Rainfall (P 7d)"]
        C["Cyclic DOY Encodings"]
    end

    subgraph Model["Predictive Engine"]
        Ridge["Ridge Regression Forecaster\n(Chronological Split, α=1.0)"]
    end

    subgraph Outputs["Decisions & Risk Output"]
        Forecast["7-Day Storage Forecast (St+7)"]
        HVI["HVI Score (0-100)\n@ 135 LPCD"]
        Alert["Automated Alert Dispatch"]
    end

    S --> Ridge
    L --> Ridge
    D --> Ridge
    P --> Ridge
    C --> Ridge

    Ridge --> Forecast
    Forecast --> HVI
    HVI --> Alert
```

### 1. 7-Day Reservoir Storage Forecaster
- **Target**: Forecasts reservoir live storage 7 days ahead ($S_{t+7}$ in Million Cubic Metres, MCM).
- **Validation**: Strict forward chronological validation (zero future data leakage).
- **Metrics**:
  - **$R^2$ Score**: **0.999**
  - **RMSE**: **7.02 MCM**
  - Outperformed persistence baselines during seasonal drawdown periods.

### 2. Hydrological Vulnerability Index (HVI)
Quantifies community water stress on a 0–100 scale:
$$HVI = 0.45 \times RDR + 0.35 \times PD + 0.20 \times PDP$$
- **Reservoir Depletion Ratio (45%)**: Measures remaining live storage against conservation limits.
- **Precipitation Deficit (35%)**: Deviation of trailing 30-day actual rainfall from seasonal normal.
- **Population Demand Pressure (20%)**: Projected civil consumption assessed against the national standard of **135 Litres Per Capita per Day (LPCD)**.

---

## 💬 Grounded AI Assistant

The AI assistant operates in two modes:
1. **Multi-LLM Integration**: When configured with `GROQ_API_KEY` (Llama 3.3 70B), `GEMINI_API_KEY` (Gemini 1.5 Flash), or `OPENAI_API_KEY` (GPT-4o-mini), queries are routed to the external model with telemetry context.
2. **Built-in Conversational Grounding Engine**: If no external API key is provided, a fast built-in engine answers queries concisely and naturally like ChatGPT, pulling live data directly from database records.

### Key Capabilities:
- **Instant Telemetry**: Live dam levels, percentage capacities, river stages, and danger mark margins.
- **Natural Conversation**: Concise answers to greetings, general knowledge, and conversational pleasantries.
- **Engineering Guides**: Step-by-step guides for rooftop rainwater harvesting, drip irrigation, and flood go-bags.
- **Security Defense**: Outbound filters prevent sensitive credential leaks (passwords, JWT secrets, database connection strings).

---

## 🔑 Core Features & Modules

| Feature | Description |
| :--- | :--- |
| 📊 **Executive Dashboard** | Real-time overview of national water capacity, critical reservoirs, active disaster alerts, and population vulnerability. |
| 🗺️ **Geospatial Risk Map** | Leaflet-powered interactive maps showing reservoirs, river gauges, and vulnerability heatmaps color-coded by risk. |
| 🌊 **Reservoir Telemetry** | Granular views for 13 major dams including current live storage, dead storage lines, and drawdown velocities. |
| 🛰️ **River Fluvial Monitoring** | River stage tracking against danger marks, discharge rates, and rising/falling trend detection. |
| 🚨 **Early Warning & Alerts** | Automated alerts with severity classifications (*Low, Medium, High, Critical*) and operational resolution workflows. |
| 📑 **Exportable Reports** | Generate executive PDF and Excel reports for government briefings and water budgeting. |
| 👥 **Village Demographics** | Demographic master records with population tracking for localized water budgeting. |

---

## 🗄️ Relational Database Schema

The database consists of **11 normalized tables**:

```
users ───────────► roles (RBAC: Admin, Analyst, Officer)
  │
  ├─── alerts ────────► villages & reservoirs
  ├─── predictions ───► villages
  └─── ai_conversations

reservoirs ──────► forecasts (7-day to 90-day storage predictions)
rivers ──────────► river stages, danger levels & discharge
rainfall_records ─► precipitation history
groundwater_records ─► aquifer table depth
cwc_bulletins ───► official weekly hydro bulletin logs
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- **Python**: 3.10 or 3.11
- **Node.js**: 18+ (with npm)
- **Git**

---

### 1. Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate virtual environment
python -m venv venv

# Windows PowerShell:
venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Initialize database and seed records
python -m app.db.init_db

# 5. Start the development server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Base URL: `http://localhost:8000`
- Swagger UI Documentation: `http://localhost:8000/docs`

---

### 2. Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```
- Web Application: `http://localhost:5173`

---

### 3. Docker Compose (All-in-One)

```bash
# From the project root
docker-compose up --build -d
```
Starts:
- Frontend: `http://localhost`
- Backend API: `http://localhost:8000`
- PostgreSQL: Port `5432`
- Redis: Port `6379`

---

## 🧪 Comprehensive Testing Suite

All features, predictive pipelines, and security mechanisms are guarded by automated test suites:

### Running Backend Tests (133 Tests)
```bash
cd backend
python -m pytest tests/ -v
```
Test categories include:
- `test_grounded_ai_assistant.py`: Grounded AI answers, prompt injection defense, units preservation.
- `test_water_shortage_pipeline.py`: Ridge regression forecasting, chronological split validation, HVI calculation.
- `test_flood_intelligence.py`: Fluvial river stage triggers, danger line breach detection.
- `test_cwc_bulletin.py`: Bulletin parsing, PDF extraction, and reservoir ingestion.
- `test_security_audit.py`: JWT expiration, password hashing, SQL injection defense.

### Running Frontend Tests (11 Tests)
```bash
cd frontend
npm run test
```

---

## 🔐 Security Features

- **Stateless JWT Authentication**: Access tokens (15–60 min) + Refresh tokens (7 days).
- **Bcrypt Password Hashing**: Salt factor 10.
- **Role-Based Access Control (RBAC)**: Enforced via FastAPI dependency injection (`require_role(["Admin"])`).
- **SQL Injection Defense**: Parameterized SQLAlchemy queries across all endpoints.
- **CORS Protection**: Explicit domain origin whitelisting.
- **Rate Limiting**: Defends against brute-force and scraping attacks.

---

## 📚 Technical Documentation

- 🏛️ **[Architecture Deep-Dive](./ARCHITECTURE.md)**: Detailed component diagrams, mathematical formulations, and engineering principles.
- 🚀 **[Deployment Guide](./DEPLOYMENT.md)**: Production runbook for Render, Docker, and environment configuration.
- 📖 **[Interactive Swagger API](./backend/app/main.py)**: Available at `/docs` on the live backend.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/HydrologicalEnhancement`)
3. Commit your changes (`git commit -m 'feat: add enhanced monsoon runoff model'`)
4. Push to the branch (`git push origin feature/HydrologicalEnhancement`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  <b>Built for Public Good & Climate Resilience | Production-Ready | Interview-Ready</b>
</p>
