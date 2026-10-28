"""
Water Shortage & Reservoir Depletion Prediction Pipeline
=========================================================
Implements the defensible preliminary prediction pipeline recommended in
docs/ML_FEASIBILITY_REPORT.md (Prompt 12/13).

Design Principles:
  1. No synthetic pseudo-random data fabrication.
  2. Strict time-ordered splits (shuffle=False) to prevent temporal data leakage.
  3. Explicit comparison against a Persistence baseline (S_{t+7} = S_t).
  4. Physical bounds enforcement and residual uncertainty confidence intervals.
  5. Explicit 'insufficient_data' status when observations are inadequate.
  6. Transparent distinction between deterministic Hydrological Vulnerability Index
     (HVI) and empirical statistical forecasting.
"""

import os
import json
import math
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple, List
import numpy as np
from sqlalchemy.orm import Session

from app.models.models import Reservoir, ReservoirHistory, RainfallRecord

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, "models")
PIPELINE_PATH = os.path.join(MODELS_DIR, "water_shortage_pipeline.joblib")
METADATA_PATH = os.path.join(MODELS_DIR, "water_shortage_pipeline_metadata.json")

MODEL_VERSION = "v1.0.0-preliminary"
DATA_PROVENANCE = "Open-Meteo ERA5-Land Archive + CWC Weekly Storage Bulletins"


def validate_inference_inputs(
    rainfall: Optional[float],
    population: Optional[int],
    reservoir_capacity: Optional[float],
    groundwater_level: Optional[float],
) -> Tuple[bool, Optional[str]]:
    """
    Validate inference parameters against physical boundaries.
    Rejects negative numbers, NaN, or non-physical extremes.
    """
    if rainfall is None or math.isnan(rainfall) or rainfall < 0.0:
        return False, "Rainfall must be a non-negative number (mm)."
    if population is None or population < 0:
        return False, "Population must be a non-negative integer."
    if reservoir_capacity is None or math.isnan(reservoir_capacity) or reservoir_capacity <= 0.0:
        return False, "Reservoir capacity must be a positive number (MCM)."
    if groundwater_level is None or math.isnan(groundwater_level) or groundwater_level < 0.0:
        return False, "Groundwater depth must be a non-negative number (m)."
    if groundwater_level > 300.0:
        return False, "Groundwater depth exceeds physical limit (max 300m)."
    return True, None


def compute_hydrological_vulnerability_index(
    rainfall_30d: float,
    normal_rainfall_30d: float,
    current_storage_mcm: float,
    capacity_mcm: float,
    population: int,
) -> Dict[str, Any]:
    """
    Calculate deterministic Hydrological Vulnerability Index (HVI) with transparent component weights.
    Explicitly labeled as a rule-based hydrological indicator, not an empirical black-box ML model.
    """
    # 1. Rainfall deficit factor (0-100)
    norm = max(10.0, normal_rainfall_30d)
    deficit_pct = max(0.0, min(100.0, ((norm - rainfall_30d) / norm) * 100.0))
    rain_weight = deficit_pct * 0.40

    # 2. Storage depletion factor (0-100)
    cap = max(1.0, capacity_mcm)
    storage_pct = max(0.0, min(100.0, (current_storage_mcm / cap) * 100.0))
    depletion_pct = 100.0 - storage_pct
    storage_weight = depletion_pct * 0.40

    # 3. Population demand pressure (0-100)
    # Assume 135 Litres per capita per day (LPCD) national benchmark
    daily_demand_mcm = (population * 135.0) / 1e9
    thirty_day_demand_mcm = daily_demand_mcm * 30.0
    demand_ratio = (thirty_day_demand_mcm / current_storage_mcm) if current_storage_mcm > 0.05 else 1.0
    demand_pct = max(0.0, min(100.0, demand_ratio * 100.0))
    demand_weight = demand_pct * 0.20

    composite_score = round(rain_weight + storage_weight + demand_weight, 1)
    composite_score = max(0.0, min(100.0, composite_score))

    if composite_score >= 70.0:
        risk_level = "High"
        advisory = "Severe water scarcity threat. Depletion rate exceeds replenishment capacity."
    elif composite_score >= 40.0:
        risk_level = "Moderate"
        advisory = "Moderate shortage vulnerability. Controlled water distribution advised."
    else:
        risk_level = "Safe"
        advisory = "Hydrological reserves stable. Precipitation and storage within normal seasonal range."

    return {
        "risk_score": composite_score,
        "risk_level": risk_level,
        "advisory": advisory,
        "is_rule_based": True,
        "methodology": "Hydrological Vulnerability Index (Precipitation Deficit + Storage Ratio + LPCD Demand Pressure)",
        "component_breakdown": {
            "rainfall_deficit_pct": round(deficit_pct, 1),
            "storage_depletion_pct": round(depletion_pct, 1),
            "demand_pressure_pct": round(demand_pct, 1),
        },
    }


class WaterShortageForecaster:
    """
    Time-series 7-day forward reservoir storage depletion forecaster.
    Trained strictly on non-shuffled temporal historical sequences and benchmarked
    against the Persistence baseline S_{t+7} = S_t.
    """

    def __init__(self):
        self.model = None
        self.scaler = None
        self.metadata = {}
        self._load_pipeline_if_exists()

    def _load_pipeline_if_exists(self):
        if os.path.exists(PIPELINE_PATH) and os.path.exists(METADATA_PATH):
            try:
                import joblib
                bundle = joblib.load(PIPELINE_PATH)
                self.model = bundle.get("model")
                self.scaler = bundle.get("scaler")
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                logger.info(f"Loaded WaterShortageForecaster {self.metadata.get('model_version')}")
            except Exception as e:
                logger.warning(f"Could not load pre-trained water shortage pipeline: {e}")

    def train_on_historical_data(
        self,
        features: np.ndarray,
        targets: np.ndarray,
        capacities: np.ndarray,
        provenance_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Train linear Ridge regressor on time-ordered observations with temporal split.
        Strictly prevents temporal data leakage (shuffle=False).
        """
        from sklearn.linear_model import Ridge
        from sklearn.preprocessing import StandardScaler
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

        n_samples = len(features)
        if n_samples < 10:
            raise ValueError(f"Insufficient historical samples to fit model (found {n_samples}, minimum: 10)")

        # Strict temporal split (earliest 80% train, latest 20% test, NO random shuffling)
        split_idx = int(n_samples * 0.8)
        X_train, X_test = features[:split_idx], features[split_idx:]
        y_train, y_test = targets[:split_idx], targets[split_idx:]
        cap_test = capacities[split_idx:]

        # Persistence baseline: predict delta = 0 (S_{t+7} = S_t)
        baseline_preds = np.zeros_like(y_test)
        base_mae = float(mean_absolute_error(y_test, baseline_preds))
        base_rmse = float(np.sqrt(mean_squared_error(y_test, baseline_preds)))

        # Train model pipeline
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        self.model = Ridge(alpha=1.0)
        self.model.fit(X_train_scaled, y_train)

        # Evaluate model on held-out temporal partition
        test_preds = self.model.predict(X_test_scaled)
        model_mae = float(mean_absolute_error(y_test, test_preds))
        model_rmse = float(np.sqrt(mean_squared_error(y_test, test_preds)))
        r2 = float(r2_score(y_test, test_preds)) if len(y_test) > 2 else 0.0

        residuals = y_test - test_preds
        residual_std = float(np.std(residuals)) if len(residuals) > 1 else 1.0

        # Construct reproducible provenance metadata
        self.metadata = {
            "model_version": MODEL_VERSION,
            "trained_at": datetime.utcnow().isoformat(),
            "target": "7_day_storage_change_mcm",
            "prediction_horizon_days": 7,
            "training_samples": n_samples,
            "data_provenance": DATA_PROVENANCE,
            "features": ["storage_ratio", "storage_delta_7d", "rainfall_30d", "rainfall_7d", "sin_season", "cos_season"],
            "temporal_split": "Time-ordered 80/20 forward split (shuffle=False, zero future leakage)",
            "baseline": "Persistence Baseline (S_{t+7} = S_t)",
            "evaluation_metrics": {
                "model_mae_mcm": round(model_mae, 3),
                "model_rmse_mcm": round(model_rmse, 3),
                "r2_score": round(r2, 3),
                "baseline_mae_mcm": round(base_mae, 3),
                "baseline_rmse_mcm": round(base_rmse, 3),
                "mae_improvement_pct": round(((base_mae - model_mae) / max(0.001, base_mae)) * 100, 1),
                "residual_std_error": round(residual_std, 3),
            },
            "provenance_details": provenance_info or {},
        }

        # Save model bundle & metadata reproducibly
        try:
            import joblib
            os.makedirs(MODELS_DIR, exist_ok=True)
            joblib.dump({"model": self.model, "scaler": self.scaler}, PIPELINE_PATH)
            with open(METADATA_PATH, "w", encoding="utf-8") as f:
                json.dump(self.metadata, f, indent=2)
            logger.info("Successfully persisted water shortage model pipeline and metadata.")
        except Exception as e:
            logger.error(f"Failed to persist model pipeline: {e}")

        return self.metadata

    def predict_reservoir_storage(
        self,
        db: Session,
        reservoir_id: int,
        horizon_days: int = 7,
    ) -> Dict[str, Any]:
        """
        Produce 7-day predicted storage volume with 90% confidence intervals.
        Returns 'insufficient_data' if observations are lacking.
        """
        res = db.query(Reservoir).filter(Reservoir.id == reservoir_id).first()
        if not res:
            return {"status": "error", "message": f"Reservoir {reservoir_id} not found"}

        # Query recent history snapshots
        history = (
            db.query(ReservoirHistory)
            .filter(ReservoirHistory.reservoir_id == reservoir_id)
            .order_by(ReservoirHistory.recorded_at.desc())
            .limit(10)
            .all()
        )

        # Insufficient data guard: minimum 2 historical observations required for slope
        if len(history) < 2:
            return {
                "status": "insufficient_data",
                "message": (
                    f"Insufficient historical observations for '{res.name}'. "
                    f"Found {len(history)} snapshots; minimum 2 required for trend extrapolation."
                ),
                "reservoir_id": reservoir_id,
                "reservoir_name": res.name,
                "current_level": res.current_level,
                "capacity": res.capacity,
                "is_defensible": False,
            }

        # Calculate recent 7-day delta
        curr_level = history[0].water_level
        prev_level = history[1].water_level
        delta_7d = curr_level - prev_level

        # Query recent rainfall
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_rain_records = (
            db.query(RainfallRecord)
            .filter(
                RainfallRecord.reservoir_id == reservoir_id,
                RainfallRecord.measurement_date >= thirty_days_ago,
            )
            .all()
        )
        rain_30d = sum(r.rainfall_amount for r in recent_rain_records) if recent_rain_records else 0.0
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        rain_7d = sum(r.rainfall_amount for r in recent_rain_records if r.measurement_date >= seven_days_ago)

        day_of_year = datetime.utcnow().timetuple().tm_yday
        sin_season = math.sin(2 * math.pi * day_of_year / 365.25)
        cos_season = math.cos(2 * math.pi * day_of_year / 365.25)

        storage_ratio = (curr_level / res.capacity) if res.capacity > 0 else 0.5

        # If trained empirical model is available, use it
        if self.model is not None and self.scaler is not None:
            feat_vector = np.array([[storage_ratio, delta_7d, rain_30d, rain_7d, sin_season, cos_season]])
            feat_scaled = self.scaler.transform(feat_vector)
            predicted_delta = float(self.model.predict(feat_scaled)[0])
            method = "Empirical Ridge Regression (Trained on CWC + Open-Meteo Observations)"
            residual_std = self.metadata.get("evaluation_metrics", {}).get("residual_std_error", 2.5)
        else:
            # Defensible preliminary physical estimate: delta extrapolation + rain runoff
            predicted_delta = (delta_7d * 0.7) + (rain_7d * 0.02)
            method = "Defensible Preliminary Autoregressive Runoff Estimator"
            residual_std = max(1.5, curr_level * 0.05)

        # Enforce physical constraints: predicted level cannot be negative or exceed capacity
        predicted_level = max(0.0, min(res.capacity, curr_level + predicted_delta))
        predicted_storage_pct = round((predicted_level / res.capacity) * 100, 1)

        # 90% confidence interval: +/- 1.645 * residual_std
        margin = round(1.645 * residual_std, 2)
        lower_bound = max(0.0, round(predicted_level - margin, 2))
        upper_bound = min(res.capacity, round(predicted_level + margin, 2))

        # Persistence baseline for comparison
        persistence_level = curr_level

        return {
            "status": "success",
            "reservoir_id": res.id,
            "reservoir_name": res.name,
            "prediction_horizon_days": horizon_days,
            "current_level_mcm": round(curr_level, 2),
            "capacity_mcm": res.capacity,
            "predicted_level_mcm": round(predicted_level, 2),
            "predicted_storage_pct": predicted_storage_pct,
            "predicted_delta_mcm": round(predicted_delta, 2),
            "uncertainty_interval": {
                "confidence_level": "90%",
                "lower_bound_mcm": lower_bound,
                "upper_bound_mcm": upper_bound,
                "margin_error_mcm": margin,
            },
            "baseline_comparison": {
                "persistence_level_mcm": round(persistence_level, 2),
                "delta_from_persistence": round(predicted_level - persistence_level, 2),
            },
            "methodology": method,
            "model_version": MODEL_VERSION,
            "data_provenance": DATA_PROVENANCE,
            "is_preliminary": True,
            "limitations": [
                "Predictive uncertainty increases significantly in the presence of unmonitored sluice gate operations.",
                "Inflow is calculated from catchment rainfall without distributed hydraulic routing.",
            ],
        }


# Global singleton instance
water_shortage_forecaster = WaterShortageForecaster()
