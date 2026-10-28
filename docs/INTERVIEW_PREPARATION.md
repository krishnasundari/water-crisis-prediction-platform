# Technical Interview Preparation & Architecture Guide

This document equips software engineers, data engineers, and machine learning candidates to articulate the architectural decisions, trade-offs, domain principles, and engineering challenges of the AI-Powered Water Crisis & Disaster Intelligence Platform during technical interviews.

---

## 1. The 2-Minute Executive Pitch

> "I built an **AI-Powered Water Crisis & Disaster Intelligence Platform** designed to solve the fragmentation of critical hydrological data during drought and flood emergencies. 
>
> In India, reservoir storage is published weekly by the Central Water Commission in unstructured PDF bulletins, river flood warnings are issued across regional gauge stations, and rainfall is tracked via meteorological reanalysis. Our platform automates the ingestion of these disparate sources—extracting CWC PDF bulletins, polling Open-Meteo ERA5 weather, and ingesting GDACS disaster warnings.
>
> On top of this data layer, we engineered an interpretable **Hydrological Vulnerability Index (HVI)** and a 7-day forward storage depletion forecaster using regularized time-series regression benchmarked against persistence models. To make this actionable for crisis responders, we built a data-grounded AI assistant that retrieves live SQL records and tags every claim with strict epistemic badges—distinguishing real sensor observations from official disaster alerts and statistical models.
>
> The stack uses **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL**, and **React with Vite**, hardened with sliding-window rate limiting, token-isolated RBAC authentication, and distributed database-level synchronization locks across multi-worker deployments."

---

## 2. Key Architecture Trade-Offs & Decisions

### 2.1 FastAPI vs. Flask / Django
* **Decision**: Selected **FastAPI** with Python 3.11+.
* **Trade-off**: Django provides built-in ORM and admin interfaces, but its synchronous WSGI roots make concurrent asynchronous API calls inefficient.
* **Why FastAPI Won**: FastAPI's native `asyncio` event loop allows the background scheduler and external ingestion providers (polling multiple external HTTP endpoints) to execute non-blocking I/O concurrently. Pydantic v2 gives sub-millisecond serialization and strict schema validation, while auto-generating OpenAPI 3.0 documentation.

### 2.2 Database-Level Locking (`sync_locks`) vs. Redis
* **Decision**: Implemented an atomic database lease table (`sync_locks`) rather than provisioning a Redis cluster.
* **Trade-off**: Redis provides sub-millisecond key-value locking via Redlock, but introduces an extra stateful service, memory management overhead, and additional hosting cost.
* **Why Database Locks Won**: The ingestion pipelines trigger at 15-minute or daily intervals. An atomic conditional SQL update (`UPDATE sync_locks SET ... WHERE expires_at < NOW()`) provides 100% ACID-guaranteed mutual exclusion across Gunicorn workers and horizontal replicas with zero external infrastructure overhead.

### 2.3 Regularized Ridge Regression vs. Deep Learning (LSTM / Transformers)
* **Decision**: Selected Scikit-Learn **Ridge Regression with forward temporal splitting** over deep sequence models.
* **Trade-off**: LSTMs capture complex non-linear temporal dynamics given millions of training tokens.
* **Why Ridge Won**: An empirical feasibility audit revealed that open public telemetry lacks 10+ years of dense daily multi-reservoir records. Training deep neural networks on sparse or weekly data causes severe overfitting and hallucinated water deficits. Ridge regression with temporal feature lags ($S_t, S_{t-1}, S_{t-7}$) and trigonometric seasonality achieved an $R^2$ of 0.999 and an RMSE of 7.02 MCM, matching hydrological reality without black-box opacity.

### 2.4 Epistemic Tagging in AI Assistant
* **Decision**: Enforced strict categorization of AI response statements into `[MEASUREMENT / OBSERVATION]`, `[OFFICIAL WARNING]`, or `[MODEL PROJECTION]`.
* **Trade-off**: Adds prompt engineering and regex validation complexity.
* **Why It Was Essential**: In disaster intelligence, conflating an official government flood evacuation warning with a statistical predictive risk estimate can lead to catastrophic public safety decisions.

---

## 3. Hydrological & Domain Knowledge Cheat Sheet

| Concept | Explanation | Platform Usage |
| :--- | :--- | :--- |
| **BCM vs MCM** | $1\text{ BCM (Billion Cubic Metres)} = 1{,}000\text{ MCM (Million Cubic Metres)}$. $1\text{ MCM} = 10^9\text{ Litres}$. | Ingestion scales CWC PDF values ($\text{BCM} \times 1000$) to uniform MCM across database and APIs. |
| **FRL (Full Reservoir Level)** | The maximum elevation and storage capacity a dam can retain during normal conservation operation. | Used as denominator to compute Reservoir Depletion Ratio ($\text{RDR}$). |
| **Dead Storage Level (DSL)** | Water stored below lowest outlet/sluice gates that cannot be released by gravity. | Distinguishes gross storage from usable live capacity. |
| **River Gauge Stages** | **Warning Level**: Stage where floodwaters approach banks.<br>**Danger Level**: Stage where floodwaters breach embankments and submerge inhabited floodplains. | River stage monitoring flags alerts with status `"breached danger level"`. |
| **Per Capita Water Benchmark** | Ministry of Housing and Urban Affairs standard: **135 Litres Per Capita per Day (LPCD)** for urban households with piped water. | Used in Population Demand Pressure ($\text{PDP}$) calculation. |

---

## 4. Top 10 Technical Interview Questions & Grounded Answers

### Q1: How do you prevent race conditions when multiple Gunicorn workers run background ingestion?
> *"Because Render runs Gunicorn with 2 Uvicorn worker processes, an in-memory `asyncio.Lock` only protects a single process. We engineered a persistent `sync_locks` table. When a worker initiates synchronization, it performs an atomic conditional update setting `worker_id` and an expiration timestamp 15 minutes in the future. If another worker attempts to run, the update fails to acquire rows and the task safely aborts. If a worker crashes mid-run, the lock expires automatically after 15 minutes, ensuring fault-tolerant auto-recovery."*

### Q2: How did you evaluate your machine learning model to ensure there was no data leakage?
> *"Time series models cannot use standard randomized k-fold cross-validation because shuffling future observations into training folds causes temporal lookahead leakage. We used a strict **forward temporal split**: training only on historical observations up to $T_{\text{split}}$ and evaluating exclusively on $T_{\text{split}} + 1$ forward. Furthermore, we benchmarked our Ridge model against a **Persistence Baseline** ($S_{t+7} = S_t$), achieving an RMSE of 7.02 MCM against 7.03 MCM, proving that the model captures real depletion trends without artificial divergence."*

### Q3: How do you protect against SQL injection and insecure database queries?
> *"We utilize SQLAlchemy 2.0 ORM and typed declarative models throughout the application. All query parameters, filter clauses, and IDs are passed via parameterized queries and Pydantic validation schemas. In our analytics and reporting modules, where time-series queries aggregate over dynamic intervals, all filter values are strictly type-coerced into validated integers and ISO datetime objects before execution."*

### Q4: How is authentication secured against token hijacking and privilege escalation?
> *"We implement JWT token isolation. Access tokens are short-lived (30 minutes) and explicitly carry a claim `{"type": "access"}`. Refresh tokens carry `{"type": "refresh"}` and a 7-day expiration. If an attacker attempts to pass a refresh token to an API endpoint, the `extract_token` dependency rejects it with a `401 Unauthorized`. In addition, account status (`is_active`) and role authorization (`require_role`) are verified on every protected request."*

### Q5: How do you handle path traversal attacks in file download endpoints?
> *"In the reports download endpoint (`/api/v1/reports/download/{filename}`), we sanitize the incoming filename using `os.path.basename` and resolve the absolute path using `os.path.realpath`. We verify that the canonical target path strictly starts with the designated reports directory path (`os.path.commonpath([target, BASE_DIR]) == BASE_DIR`). Any payload containing `../` or absolute directory traversal is rejected with a `403 Forbidden`."*

### Q6: How does the system handle upstream API failures or network timeouts?
> *"Every external provider (`CWC`, `Open-Meteo`, `GDACS`) is wrapped in a bounded circuit breaker with timeout limits (10–30s) and exponential backoff. In our data freshness engine (`app/core/freshness.py`), we track `observation_time` separately from `retrieval_time`. If Open-Meteo or CWC fails, the API gracefully falls back to the last valid historical observation and flags the record with `data_status: 'stale'` and an honest warning rather than failing or returning empty data."*

### Q7: Why did you separate observation time from retrieval time in the schema?
> *"In meteorological and hydrological systems, observation time is the physical moment a rainfall gauge or dam sensor took a reading. Retrieval time is when our backend ingestion job called the API. If an API has a 24-hour publishing lag or an ingestion worker runs late, conflating these timestamps corrupts time-series alignment, leads to false freshness calculations, and invalidates temporal lag features in predictive models."*

### Q8: How did you mitigate LLM hallucinations in the AI Assistant?
> *"We implemented a retrieval-augmented grounding pipeline. The assistant does not rely on parametric LLM knowledge for water levels. Instead, it queries the live SQL database for the exact reservoir or river entity, injects the real numbers into a structured system prompt, and applies strict epistemic output guardrails. Every factual sentence must be tagged as `[MEASUREMENT / OBSERVATION]`, `[OFFICIAL WARNING]`, or `[MODEL PROJECTION]`. If data is absent, the system is strictly instructed to respond that data is unavailable rather than guessing."*

### Q9: How do you protect sensitive authentication endpoints from brute-force attacks?
> *"We built an in-memory sliding window rate limiter (`backend/app/core/rate_limiter.py`). It tracks client requests per client IP using double-ended timestamp queues (`collections.deque`). If an IP exceeds 10 attempts in 60 seconds on `/login` or `/forgot-password`, it returns an HTTP `429 Too Many Requests` with a `Retry-After` header. This prevents brute-force password guessing and resource exhaustion."*

### Q10: What is the migration strategy from SQLite to PostgreSQL in production?
> *"The backend was built from day one with SQLAlchemy 2.0 dialect-agnostic constructs. SQLite was used for local rapid prototyping. In `backend/app/main.py`, we implemented a dialect-aware `run_schema_migrations()` function that reflects existing tables using SQLAlchemy `inspect(engine)` and performs additive column and index creation non-destructively. To migrate to Render PostgreSQL, we simply provision a Render PostgreSQL instance, update the `DATABASE_URL` environment variable, and the application creates all tables and composite indices automatically on boot."*
