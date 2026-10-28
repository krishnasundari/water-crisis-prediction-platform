# Data Pipeline Specification & Ingestion Architecture

This document provides a technical specification of the automated data ingestion pipelines, validation engines, synchronization locks, and data freshness policies implemented in the AI-Powered Water Crisis & Disaster Intelligence Platform.

---

## 1. Pipeline Overview

The platform ingests, validates, normalizes, and indexes hydrological and meteorological data from three external sources:
1. **Central Water Commission (CWC), Government of India**: Weekly Reservoir Storage Bulletins (PDF documents).
2. **Open-Meteo Historical & Forecast Weather API**: Reanalysis (ERA5-Land) daily rainfall and multi-day meteorological forecasts.
3. **Global Disaster Alert and Coordination System (GDACS)**: Official international flood, tropical cyclone, and disaster feeds.

```
       [ CWC Weekly PDF Bulletin ]          [ Open-Meteo API ]         [ GDACS Alerts Feed ]
                    │                               │                            │
                    ▼                               ▼                            ▼
         cwc_bulletin_provider.py       open_meteo_archive.py         gdacs_provider.py
                    │                               │                            │
                    └───────────────────────┬───────┴────────────────────────────┘
                                            ▼
                               [ sync_locks Database Lock ]
                                 (Multi-Worker Concurrency)
                                            │
                                            ▼
                           [ Data Validation & Freshness ]
                               (app/core/freshness.py)
                                            │
                         ┌──────────────────┴──────────────────┐
                         ▼                                     ▼
              [ Observation Storage ]               [ Alert Engine Rules ]
              ReservoirHistory / Weather             FloodAlert (is_official)
                         │                                     │
                         └──────────────────┬──────────────────┘
                                            ▼
                                 [ FastAPI Query Layer ]
```

---

## 2. Ingestion Providers & Normalization

### 2.1 CWC Weekly Reservoir Bulletin Ingestion
* **Source Module**: `backend/app/providers/cwc_bulletin_provider.py` & `backend/app/services/cwc_reservoir_ingest.py`
* **Format**: Digital PDF bulletin published weekly (typically Thursdays) by the Hydrological Studies Organisation, Central Water Commission.
* **Extraction Engine**: `pdfplumber` tabular parser extracting structured text and numerical columns.
* **Unit Conversion & Normalization**:
  * The official CWC bulletin lists capacities and live storage in **Billion Cubic Metres (BCM)** or percentages of Full Reservoir Level (FRL).
  * Storage values are normalized to **Million Cubic Metres (MCM)** ($1\text{ BCM} = 1{,}000\text{ MCM}$) to align with municipal demand calculations and hydraulic reservoir modeling.
  * Formula: $\text{Storage (MCM)} = \text{Storage (BCM)} \times 1000$.
* **Idempotency & Duplicate Prevention**:
  * Observations are keyed by `(reservoir_id, recorded_date)`.
  * If a record for the specified date already exists in `reservoir_history`, ingestion performs an update or skips the duplicate, preserving observation lineage without artificial duplicate records.

### 2.2 Open-Meteo Meteorological Ingestion
* **Source Module**: `backend/app/providers/open_meteo_archive.py` & `backend/app/services/weather_service.py`
* **Format**: JSON REST API with hourly and daily aggregation parameters (`precipitation_sum`, `temperature_2m_max`, `temperature_2m_min`, `soil_moisture_0_to_10cm`).
* **Rate Guard & Circuit Breaker**:
  * Historical backfill is bounded to max 2,000 records per sync cycle to prevent HTTP 429 throttling.
  * In case of upstream timeouts or HTTP errors, an exponential backoff circuit breaker trips to prevent repeated failing requests and falls back to cached records.
* **Observation vs Retrieval Timestamps**:
  * Each record stores `observation_time` (the physical UTC date of measured weather) and `retrieval_time` (the exact UTC timestamp when our ingestion worker acquired the payload).

### 2.3 GDACS Disaster & Flood Warning Ingestion
* **Source Module**: `backend/app/providers/gdacs_provider.py` & `backend/app/services/flood_service.py`
* **Format**: GeoJSON and RSS/XML alerts filtered by bounding box for the Indian subcontinent (`bbox: [68.0, 6.0, 97.5, 37.0]`).
* **Official vs Model-Generated Tagging**:
  * GDACS alerts are marked with `is_official=True`, preserving the `source_identifier` (e.g. `GDACS-FL-100293`), `issuing_authority="GDACS / UN-OCHA"`, and `published_at` timestamp.
  * Alerts generated internally by algorithmic thresholds (river stage > danger mark, severe rainfall anomalies) are flagged with `is_official=False` and tagged with the exact deterministic rule triggered.

---

## 3. Concurrency Protection & Multi-Worker Coordination

On platforms like Render, the web application runs under Gunicorn with multiple Uvicorn workers (`gunicorn app.main:app --workers 2 ...`). Process-local memory locks (`asyncio.Lock()`) are insufficient because each worker process has an isolated event loop and memory space.

### 3.1 Distributed Lock Table (`sync_locks`)
To ensure that scheduled data synchronization never runs concurrently across multiple worker processes or horizontal replicas, the system implements a database-level lock mechanism:
* **Table**: `sync_locks`
  * `task_name` (VARCHAR, Primary Key)
  * `locked_at` (TIMESTAMP WITH TIME ZONE)
  * `worker_id` (VARCHAR)
  * `expires_at` (TIMESTAMP WITH TIME ZONE)
* **Lock Protocol**:
  1. **Atomic Acquisition**: An ingestion worker attempts an `INSERT` or an atomic conditional `UPDATE WHERE expires_at < NOW()`.
  2. **Bounded Lease**: Locks are leased for a maximum of 15 minutes.
  3. **Auto-Recovery**: If a worker process crashes mid-sync, the lease naturally expires after 15 minutes, allowing subsequent runs to acquire the lock without administrative intervention.
  4. **Release on Completion**: Upon successful completion or handled failure, the worker releases the lock within a `finally:` block.

---

## 4. Data Quality Rules & Freshness Policy

The freshness engine (`backend/app/core/freshness.py`) defines strict, empirical staleness thresholds matching each provider's actual reporting schedule:

| Data Source | Reporting Frequency | Freshness SLA Threshold | Stale Threshold | Handling Policy |
| :--- | :--- | :--- | :--- | :--- |
| **CWC Reservoirs** | Weekly (every Thursday) | 8 Days | 14 Days | Display warning flag; do not interpolate fake storage |
| **Open-Meteo Weather** | Daily (Reanalysis ERA5) | 36 Hours | 72 Hours | Fall back to last valid reanalysis; flag staleness |
| **GDACS Floods** | Near Real-Time (6-hourly) | 6 Hours | 12 Hours | Deactivate expired events; preserve historical audit log |
| **River Gauge Stages** | Daily / Sub-daily | 24 Hours | 48 Hours | Flag offline gauges; calculate risks with uncertainty flag |

### Epistemic Integrity Guarantee
- If a sensor or agency stops reporting, **missing observations are never synthetically fabricated or smoothed with dummy values**.
- The frontend and AI assistant explicitly inform the user: *"Data is stale by X days"* or *"Observation unavailable for date YYYY-MM-DD"*.
