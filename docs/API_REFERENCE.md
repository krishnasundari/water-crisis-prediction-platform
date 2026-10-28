# API Reference & Endpoint Specification

This document provides a complete inventory of the REST API endpoints exposed by the AI-Powered Water Crisis & Disaster Intelligence Platform backend.

---

## 1. General Information & Conventions

* **Base URL (Local)**: `http://localhost:8000`
* **Base URL (Production)**: `https://water-crisis-prediction-platform-1.onrender.com`
* **Interactive OpenAPI Specs**:
  * Swagger UI: `/docs`
  * ReDoc: `/redoc`
* **Authentication Header**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
* **Role-Based Access Control (RBAC)**:
  * Supported roles: `admin`, `official`, `analyst`, `citizen`
  * Protected endpoints enforce role requirements or require authenticated tokens.
  * Token isolation ensures `refresh` tokens cannot be used to authenticate API requests.
* **Rate Limiting**: Sliding window in-memory limiter applied on sensitive auth endpoints (default: 10 requests / 60 seconds).

---

## 2. System Endpoints

### `GET /health`
* **Description**: Liveness and readiness probe.
* **Auth**: None.
* **Response `200 OK`**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "debug": false
}
```

### `GET /`
* **Description**: API metadata and service directory.
* **Auth**: None.

---

## 3. Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public (Rate Limited) | Register a new user account with email and password. |
| `POST` | `/api/v1/auth/login` | Public (Rate Limited) | Authenticate user credentials; returns access & refresh tokens. |
| `POST` | `/api/v1/auth/refresh` | Public (Rate Limited) | Exchange a valid refresh token for a new access token. |
| `POST` | `/api/v1/auth/google` | Public (Rate Limited) | Verify Google OAuth2 ID token and authenticate/create user. |
| `POST` | `/api/v1/auth/forgot-password` | Public (Rate Limited) | Initiate password reset token (account enumeration protected). |
| `POST` | `/api/v1/auth/reset-password` | Public (Rate Limited) | Complete password reset using secure token. |
| `GET` | `/api/v1/auth/me` | Bearer Token | Retrieve currently authenticated user profile and active role. |

---

## 4. Reservoirs & Dam Infrastructure (`/api/v1/reservoirs`)

| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reservoirs` | `state`, `district`, `status` | List monitored reservoirs with current storage, capacity, and freshness metadata. |
| `GET` | `/api/v1/reservoirs/{id}` | Path: `id` (int) | Detailed telemetry for a single reservoir. |
| `GET` | `/api/v1/reservoirs/{id}/history` | `days` (default 30) | Chronological historical observations of water level and storage (MCM). |
| `POST` | `/api/v1/reservoirs` | JSON Body | Admin-only: Register a new reservoir station. |

---

## 5. Rivers & Gauge Telemetry (`/api/v1/rivers`)

| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/rivers` | `basin`, `state`, `status` | List monitored river stations with current stage, danger mark, and warning status. |
| `GET` | `/api/v1/rivers/{id}` | Path: `id` (int) | Single river gauge station profile. |
| `GET` | `/api/v1/rivers/{id}/history` | `days` (default 30) | Historical stage observations for flood progression analysis. |

---

## 6. Villages & Community Vulnerability (`/api/v1/villages`)

| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/villages` | `district`, `state` | List populated communities with population census and coordinates. |
| `GET` | `/api/v1/villages/{id}` | Path: `id` (int) | Detailed community profile and water source mappings. |
| `GET` | `/api/v1/villages/{id}/stress` | Path: `id` (int) | Real-time computed water stress level based on local supply and demand. |

---

## 7. Flood Intelligence & Official Warnings (`/api/v1/flood-intelligence`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/flood-intelligence/overview` | Aggregated flood severity summary, breached stations count, and active warnings. |
| `GET` | `/api/v1/flood-intelligence/warnings` | Official GDACS alerts and river danger breach events with geo-coordinates. |

---

## 8. Alerts & Incident Management (`/api/v1/alerts`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/alerts` | Public / Token | List active, acknowledged, or resolved alerts with full lineage. |
| `POST` | `/api/v1/alerts/{id}/acknowledge` | Official / Admin | Acknowledge an alert, recording username and timestamp. |
| `POST` | `/api/v1/alerts/{id}/resolve` | Official / Admin | Mark alert resolved with required `resolution_notes`. |

---

## 9. Predictions & Shortage Risk (`/api/v1/predictions`)

| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/predictions/shortage-risk` | `state`, `district` | Computes Hydrological Vulnerability Index (HVI: 0–100) per region. |
| `GET` | `/api/v1/predictions/forecast/{reservoir_id}` | Path: `reservoir_id` | Returns 7-day Ridge Regression storage projection with confidence intervals. |

---

## 10. Analytics & Reporting (`/api/v1/analytics` & `/api/v1/reports`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/analytics/history-series` | Public | Time series observations across `category` (`reservoir`, `rainfall`, `river`). |
| `GET` | `/api/v1/analytics/water-balance-summary` | Public | Basin-level hydrological balance (inflow, outflow, storage change). |
| `GET` | `/api/v1/reports` | Bearer Token | List generated operational summary and audit reports. |
| `POST` | `/api/v1/reports/export` | Bearer Token | Export PDF/CSV audit reports for specific time windows. |
| `GET` | `/api/v1/reports/download/{filename}` | Bearer Token | Secure report download with path-traversal prevention. |

---

## 11. Grounded AI Assistant (`/api/v1/ai`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/ai/query` | Grounded QA engine querying live SQL database; generates responses with epistemic tags `[MEASUREMENT / OBSERVATION]`, `[OFFICIAL WARNING]`, or `[MODEL PROJECTION]`. |
| `GET` | `/api/v1/ai/context-snapshot` | Diagnostic endpoint returning current grounded context vectors. |

---

## 12. Administrative Controls & Data Sync (`/api/v1/admin`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/admin/sync-now` | Admin Only | Force immediate manual execution of all external data ingestion pipelines. |
| `GET` | `/api/v1/admin/sync-status` | Admin Only | Inspect distributed sync lock status, last success timestamps, and worker leases. |

---

## 13. HTTP Error Response Codes

| Status Code | Description | Standard JSON Error Payload |
| :--- | :--- | :--- |
| **`400 Bad Request`** | Malformed parameters or business rule violation | `{"detail": "..."}` |
| **`401 Unauthorized`** | Missing or expired JWT token | `{"detail": "Not authenticated"}` |
| **`403 Forbidden`** | Insufficient role permissions or inactive account | `{"detail": "Operation not permitted"}` |
| **`404 Not Found`** | Requested entity or observation does not exist | `{"detail": "Resource not found"}` |
| **`422 Unprocessable`** | Pydantic schema validation failure | `{"detail": [{"loc": [...], "msg": "..."}]}` |
| **`429 Too Many Requests`** | Rate limit exceeded | `{"detail": "Rate limit exceeded. Try again in 60s."}` |
| **`500 Internal Error`** | Unhandled exception (traceback redacted) | `{"detail": "Internal Server Error", "error_code": "..."}` |
