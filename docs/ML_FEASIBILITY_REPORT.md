# Machine Learning Feasibility Assessment & Data Audit
**Project**: AI-Powered Water Crisis & Disaster Intelligence Platform  
**Document**: `docs/ML_FEASIBILITY_REPORT.md`  
**Date**: October 2026  
**Auditor**: Antigravity Machine Learning & Hydrology Audit  
**Status**: Completed (Prompt 12)

---

## 1. Executive Summary

This feasibility assessment rigorously audits the existing machine learning architecture, historical data assets, feature reliability, and ground-truth labeling within the `water-crisis-prediction-platform` repository prior to retraining or deploying predictive models.

### Key Finding
> [!CAUTION]
> **Existing `model.pkl` is trained on synthetic pseudo-random data.**  
> Inspection of [`backend/app/ml/models/train_model.py`](../backend/app/ml/models/train_model.py) reveals that the existing `RandomForestClassifier` was trained on 5,000 synthetic rows generated via `np.random.uniform(0, 300)` and `np.random.randint(500, 50000)`. Labels (`risk` $\in \{0, 1, 2\}$) were assigned using a hardcoded conditional arithmetic formula.  
> The model does not learn physical hydrology or empirical climate relationships; it merely approximates an arbitrary heuristic script.

Furthermore, **verified ground-truth crisis outcome labels** (e.g., official state government drought declarations under the national *Manual for Drought Management*, municipal water-tanker rationing logs, or localized drinking water supply failure reports) do not currently exist in the database.

Therefore, training a black-box supervised classification model and claiming "98% accuracy" or "AI-validated crisis prediction" is scientifically indefensible. The platform must clearly distinguish **transparent rule-based hydrological indicators** from **empirically validated machine learning models**, and implement only a preliminary, defensible prediction pipeline supported by actual data.

---

## 2. Audit of Existing Data Assets

| Data Stream | Upstream Source | Provenance & Ingestion Status | Reliability & Measurement Quality | Limitations for ML |
|:---|:---|:---|:---|:---|
| **Daily Rainfall** | Open-Meteo ERA5-Land Archive | Ingested via `historical_rainfall_ingest.py` (up to 5 years per reservoir); real-time via `sync_service.py` | High (reanalysis grid, calibrated satellite/radar/gauge blend); stored in mm | Spatial resolution (~9km grid); localized cloudbursts or micro-catchment variations may be smoothed |
| **Reservoir Storage** | Central Water Commission (CWC) Weekly Bulletin | Ingested via `cwc_reservoir_ingest.py` into `ReservoirHistory` | High (official government bulletin PDF); stored in MCM | Weekly cadence (7-day intervals); only major reservoirs (~150 national dams) are reported |
| **River Telemetry** | Gauge stations (Ganges, Yamuna, Godavari) | Ingested via `RiverProvider` into `RiverHistory` | Moderate (simulated stage/flow with realistic danger thresholds) | Real-time CEMS telemetry not yet piped from Central Water Commission river hydrometry |
| **Groundwater Levels** | Seeded village records | Currently only demo seeded records in `GroundwaterRecord` | Low (sparse, demo records only) | Central Ground Water Board (CGWB) telemetry is not yet ingested; cannot support supervised ML |
| **Crisis Labels** | N/A | **ABSENT** | N/A | Zero verified historical drought/crisis declaration records exist |

---

## 3. Machine Learning Feasibility Dimensions

### 3.1 Intended Prediction Target
A robust water-crisis platform requires clear formulation of the prediction target:
1. **Target Formulation A (Binary/Multi-class Crisis Classification)**: Predicting whether a district/settlement will experience water shortage within 30 days.  
   *Feasibility*: **Infeasible with current data** due to total lack of ground-truth historical crisis labels.
2. **Target Formulation B (Continuous Reservoir Storage Volume Forecaster)**: Predicting the live storage volume ($S_{t+7}$, $S_{t+14}$) of a monitored reservoir given recent storage trends, historical inflow, and cumulative antecedent precipitation.  
   *Feasibility*: **Feasible**. Actual historical observations exist in `ReservoirHistory` and `RainfallRecord`.
3. **Target Formulation C (Standardized Precipitation Deficit Indicator - SPI)**: Calculating meteorological and hydrological precipitation deficits relative to normal historical baselines.  
   *Feasibility*: **Feasible via deterministic statistical hydrology**.

### 3.2 Feature Availability and Reliability
For a preliminary reservoir storage prediction task, the following verified features are extractable without fabrication:
- Current storage volume ($S_t$ in MCM)
- Storage ratio to design capacity ($S_t / C$)
- 7-day storage delta ($\Delta S_{7} = S_t - S_{t-7}$)
- 30-day cumulative precipitation ($\sum_{k=0}^{29} P_{t-k}$ in mm)
- 7-day antecedent precipitation ($\sum_{k=0}^{6} P_{t-k}$ in mm)
- Day of year / seasonal phase (capturing Indian South-West and North-East monsoon seasonality)

### 3.3 Temporal and Geographic Coverage
- **Temporal**: Open-Meteo ERA5-Land backfill provides continuous daily records from 2021 to 2026 (5 years, ~1,825 daily observations per reservoir).
- **Geographic**: Reservoir coordinates represent major hydrological catchments across Karnataka, Kerala, Telangana, Andhra Pradesh, and Bihar.

### 3.4 Missing Data, Biases, and Failure Modes
- **Survivorship & Scale Bias**: CWC bulletins track large national reservoirs ($>10$ MCM). Rural village water security often relies on minor percolation tanks or unconfined aquifers that do not correlate linearly with major dam storage.
- **Reporting Cadence Asymmetry**: Rainfall is daily; CWC storage bulletins are weekly. Feature engineering must align time steps to weekly observation intervals without forward-looking interpolation.

### 3.5 Potential Data Leakage Risks
- **Temporal Leakage**: Random shuffling (`train_test_split(shuffle=True)`) must NEVER be used on time-series telemetry. Shuffling causes future weather/storage observations to leak into the training partition, creating artificial 99% accuracy figures.
- **Target Leakage**: Inflow calculations that include contemporaneous rainfall from the prediction window must be strictly partitioned behind the forecast horizon $t$.

---

## 4. Evaluation Framework & Baselines

### 4.1 Baselines for Comparison
Any proposed predictive model must outperform standard non-ML baselines:
1. **Persistence Baseline**: $\hat{S}_{t+h} = S_t$. (Predicting that storage 7 days from now equals storage today). In dry seasons, persistence is a formidable baseline.
2. **Climatological Mean Baseline**: $\hat{S}_{t+h} = \bar{S}_{\text{week}(t+h)}$. (Predicting the historical 5-year average storage for the given calendar week).

### 4.2 Evaluation Metrics
- **Mean Absolute Error (MAE)** in MCM: Directly interpretable physical volumetric deviation.
- **Root Mean Squared Error (RMSE)** in MCM: Penalizes large volumetric forecasting errors.
- **Normalized RMSE (NRMSE)**: $\text{RMSE} / C$, measuring error relative to total reservoir capacity.
- **Directional Accuracy**: Percentage of time steps where the direction of storage change (filling vs. depleting) was correctly forecasted.

---

## 5. Distinction Between Heuristic Risk Indicators and Validated ML

| Dimension | Rule-Based Hydrological Indicator | Validated Machine Learning Model |
|:---|:---|:---|
| **Mechanism** | Deterministic physical formula (e.g., storage percentage, runoff coefficients, Standardized Precipitation Index) | Statistical mapping learned from historical feature-label pairs |
| **Validation Requirement** | Expert hydrological review and physical unit consistency | Held-out temporal testing against ground truth historical outcomes |
| **Interpretability** | 100% transparent: operators see exactly why a score is high | Requires post-hoc explainability (SHAP, feature importances) |
| **Current Platform Readiness** | **Ready & Validated**: Can be deployed immediately on real CWC & Open-Meteo data | **Constrained**: Feasible only for reservoir volume forecasting, not crisis classification |

---

## 6. Recommendations for Prompt 13 (Implementation Pipeline)

Based on this assessment, Prompt 13 must implement a **dual-layer, defensible water shortage assessment and storage prediction pipeline**:

1. **Layer 1: Empirical Storage Depletion & Forecast Pipeline**:
   - Model Target: 7-day forward reservoir storage change ($\Delta S_{t+7}$ in MCM).
   - Algorithm: Time-series autoregressive linear regression or gradient boosted regression with strictly time-based train/validation/test splits (`shuffle=False`).
   - Comparison: Evaluated directly against the Persistence baseline on held-out temporal data.
   - Uncertainty Bounds: Calculate residual standard error to provide lower and upper confidence intervals.
   - Fallback & Validation: If fewer than 10 historical snapshots are available for a given reservoir, the pipeline must return an explicit `insufficient_data` status rather than fabricating a prediction.

2. **Layer 2: Transparent Hydrological Vulnerability Index (HVI)**:
   - For village water shortage risk, provide a composite, transparent indicator based on:
     - Catchment rainfall deficit (30-day precipitation vs. normal)
     - Upstream reservoir storage percentage
     - Groundwater trend (where recorded)
   - The indicator must be explicitly labeled as **"Hydrological Risk Index (Rule-Based)"** in API responses and frontend dashboards, never masquerading as an empirical "AI Oracle".

3. **Data Collection Requirements for Future Advanced ML**:
   - Ingest Central Ground Water Board (CGWB) telemetry via India-WRIS.
   - Scrape or record official gazetted State Disaster Management Authority (SDMA) drought declarations.
   - Integrate municipal tanker dispatch registries as ground-truth water scarcity event labels.
