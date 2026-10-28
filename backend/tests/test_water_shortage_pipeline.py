"""
Automated tests for Water Shortage & Reservoir Depletion Prediction Pipeline (Prompt 13).
Validates:
- Physical input validation boundaries
- Hydrological Vulnerability Index (rule-based transparency)
- Ridge time-series forecaster with time-ordered forward splits (no data leakage)
- Persistence baseline comparison
- Insufficient data handling (no synthetic fabrication)
- API integration endpoints
"""

import pytest
import numpy as np
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.database import Base, get_db
from app.models.models import Reservoir, ReservoirHistory, RainfallRecord, Village
from app.ml.water_shortage_pipeline import (
    validate_inference_inputs,
    compute_hydrological_vulnerability_index,
    WaterShortageForecaster,
)
from app.ml.models.predictor import predict_water_crisis

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# =====================================================================
# 1. Physical Input Validation Tests
# =====================================================================

def test_validate_inference_inputs_valid():
    is_valid, err = validate_inference_inputs(
        rainfall=25.0,
        population=10000,
        reservoir_capacity=500.0,
        groundwater_level=15.0,
    )
    assert is_valid is True
    assert err is None


def test_validate_inference_inputs_negative_rainfall():
    is_valid, err = validate_inference_inputs(
        rainfall=-5.0,
        population=1000,
        reservoir_capacity=100.0,
        groundwater_level=10.0,
    )
    assert is_valid is False
    assert "non-negative" in err.lower()


def test_validate_inference_inputs_negative_population():
    is_valid, err = validate_inference_inputs(
        rainfall=10.0,
        population=-50,
        reservoir_capacity=100.0,
        groundwater_level=10.0,
    )
    assert is_valid is False
    assert "population" in err.lower()


def test_validate_inference_inputs_invalid_capacity():
    is_valid, err = validate_inference_inputs(
        rainfall=10.0,
        population=1000,
        reservoir_capacity=0.0,
        groundwater_level=10.0,
    )
    assert is_valid is False
    assert "capacity" in err.lower()


def test_validate_inference_inputs_excessive_groundwater():
    is_valid, err = validate_inference_inputs(
        rainfall=10.0,
        population=1000,
        reservoir_capacity=100.0,
        groundwater_level=500.0,
    )
    assert is_valid is False
    assert "physical limit" in err.lower()


# =====================================================================
# 2. Hydrological Vulnerability Index (HVI) Tests
# =====================================================================

def test_compute_hydrological_vulnerability_index_dry_and_depleted():
    hvi = compute_hydrological_vulnerability_index(
        rainfall_30d=0.0,
        normal_rainfall_30d=100.0,
        current_storage_mcm=5.0,
        capacity_mcm=100.0,
        population=50000,
    )
    assert hvi["is_rule_based"] is True
    assert hvi["risk_level"] == "High"
    assert hvi["component_breakdown"]["rainfall_deficit_pct"] == 100.0
    assert hvi["component_breakdown"]["storage_depletion_pct"] == 95.0
    assert "threat" in hvi["advisory"].lower()


def test_compute_hydrological_vulnerability_index_full_and_wet():
    hvi = compute_hydrological_vulnerability_index(
        rainfall_30d=120.0,
        normal_rainfall_30d=100.0,
        current_storage_mcm=95.0,
        capacity_mcm=100.0,
        population=2000,
    )
    assert hvi["is_rule_based"] is True
    assert hvi["risk_level"] == "Safe"
    assert hvi["component_breakdown"]["rainfall_deficit_pct"] == 0.0
    assert hvi["component_breakdown"]["storage_depletion_pct"] == 5.0


# =====================================================================
# 3. WaterShortageForecaster Time-Series Training & Baseline Tests
# =====================================================================

def test_forecaster_train_on_historical_data_insufficient_samples():
    forecaster = WaterShortageForecaster()
    features = np.ones((5, 6))
    targets = np.ones(5)
    capacities = np.ones(5)
    with pytest.raises(ValueError, match="Insufficient historical samples"):
        forecaster.train_on_historical_data(features, targets, capacities)


def test_forecaster_train_on_historical_data_leak_free_split():
    forecaster = WaterShortageForecaster()
    # 20 time-ordered observations
    np.random.seed(42)
    n = 30
    features = np.random.randn(n, 6)
    # Target: slight depletion with noise
    targets = -0.5 * features[:, 0] + np.random.randn(n) * 0.1
    capacities = np.full(n, 500.0)

    metadata = forecaster.train_on_historical_data(features, targets, capacities)

    assert metadata["target"] == "7_day_storage_change_mcm"
    assert "Persistence Baseline" in metadata["baseline"]
    assert "shuffle=False" in metadata["temporal_split"]
    assert "evaluation_metrics" in metadata
    metrics = metadata["evaluation_metrics"]
    assert "model_mae_mcm" in metrics
    assert "baseline_mae_mcm" in metrics
    assert "residual_std_error" in metrics
    assert forecaster.model is not None


# =====================================================================
# 4. Predict Reservoir Storage Tests (Handling Missing Data Honestly)
# =====================================================================

def test_predict_reservoir_storage_insufficient_data(test_db):
    # Insert a reservoir with zero historical records
    res = Reservoir(
        name="Empty History Dam",
        district="Pune",
        state="Maharashtra",
        latitude=19.5,
        longitude=74.2,
        capacity=250.0,
        current_level=120.0,
    )
    test_db.add(res)
    test_db.commit()

    forecaster = WaterShortageForecaster()
    result = forecaster.predict_reservoir_storage(test_db, res.id)

    assert result["status"] == "insufficient_data"
    assert result["is_defensible"] is False
    assert "Insufficient historical observations" in result["message"]
    assert result["reservoir_name"] == "Empty History Dam"


def test_predict_reservoir_storage_with_observations(test_db):
    res = Reservoir(
        name="Monitored Test Dam",
        district="Shimoga",
        state="Karnataka",
        latitude=14.0,
        longitude=75.5,
        capacity=400.0,
        current_level=200.0,
    )
    test_db.add(res)
    test_db.commit()

    # Add 2 history snapshots 7 days apart
    h1 = ReservoirHistory(
        reservoir_id=res.id,
        water_level=200.0,
        recorded_at=datetime.utcnow(),
    )
    h2 = ReservoirHistory(
        reservoir_id=res.id,
        water_level=205.0,
        recorded_at=datetime.utcnow() - timedelta(days=7),
    )
    # Add rainfall record
    rain = RainfallRecord(
        reservoir_id=res.id,
        district="Shimoga",
        rainfall_amount=15.0,
        measurement_date=datetime.utcnow() - timedelta(days=2),
    )
    test_db.add_all([h1, h2, rain])
    test_db.commit()

    forecaster = WaterShortageForecaster()
    result = forecaster.predict_reservoir_storage(test_db, res.id)

    assert result["status"] == "success"
    assert result["reservoir_id"] == res.id
    assert result["capacity_mcm"] == 400.0
    assert 0.0 <= result["predicted_level_mcm"] <= 400.0
    assert "uncertainty_interval" in result
    assert result["uncertainty_interval"]["confidence_level"] == "90%"
    assert result["uncertainty_interval"]["lower_bound_mcm"] <= result["uncertainty_interval"]["upper_bound_mcm"]
    assert "baseline_comparison" in result
    assert result["baseline_comparison"]["persistence_level_mcm"] == 200.0
    assert len(result["limitations"]) > 0


# =====================================================================
# 5. API Route Integration Tests
# =====================================================================

def test_api_create_prediction_validation_rejection(client):
    payload = {
        "village_id": 1,
        "rainfall": -10.0,
        "population": 5000,
        "reservoir_capacity": 100.0,
        "groundwater_level": 15.0,
    }
    response = client.post("/api/v1/predictions/", json=payload)
    assert response.status_code == 422
    assert "non-negative" in response.json()["detail"].lower()


def test_api_reservoir_shortage_not_found(client):
    response = client.get("/api/v1/predictions/reservoir-shortage/99999")
    assert response.status_code == 404


def test_api_reservoir_shortage_insufficient_data(client, test_db):
    res = test_db.query(Reservoir).filter(Reservoir.name == "Empty History Dam").first()
    response = client.get(f"/api/v1/predictions/reservoir-shortage/{res.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "insufficient_data"
    assert data["is_defensible"] is False


def test_api_reservoir_shortage_monitored(client, test_db):
    res = test_db.query(Reservoir).filter(Reservoir.name == "Monitored Test Dam").first()
    response = client.get(f"/api/v1/predictions/reservoir-shortage/{res.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["predicted_level_mcm"] > 0
    assert data["uncertainty_interval"]["confidence_level"] == "90%"


def test_api_reservoir_vulnerability(client, test_db):
    res = test_db.query(Reservoir).filter(Reservoir.name == "Monitored Test Dam").first()
    response = client.get(f"/api/v1/predictions/vulnerability-index/{res.id}?population=8000")
    assert response.status_code == 200
    data = response.json()
    assert data["is_rule_based"] is True
    assert "component_breakdown" in data
    assert "risk_score" in data
