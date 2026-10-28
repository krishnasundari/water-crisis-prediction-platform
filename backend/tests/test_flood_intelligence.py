"""
Automated Test Suite for Flood Intelligence and Official Warnings (Prompt 14).
Validates:
- Ingestion of verified official warnings (authority, validity, timestamps, source ID).
- Dynamic expiry detection (past valid_until marked expired).
- Duplicate prevention (idempotent repeated sync).
- Resilience to provider failures (no fabricated events).
- Separation between official warnings and application risk estimates.
- Physical limitations (rainfall alone != flood, shortage model != flood).
- River station flood stage categorization.
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.models.models import Alert, River, Reservoir
from app.services.flood_intelligence_service import (
    FloodIntelligenceService,
    OFFICIAL_EMERGENCY_DISCLAIMER,
    FLOOD_INTELLIGENCE_LIMITATIONS,
)
from app.providers.alert_provider import AlertProvider

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
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
# 1. Ingestion of Verified Official Warnings
# =====================================================================

def test_ingest_official_warnings_preserves_attributes(test_db):
    service = FloodIntelligenceService()
    now = datetime.utcnow()
    valid_future = now + timedelta(days=2)

    sample_official_warnings = [
        {
            "alert_type": "flood",
            "severity": "critical",
            "message": "GDACS RED FLOOD WARNING: Severe flooding reported in Brahmaputra basin.",
            "data_source": "Global Disaster Alert & Coordination System (GDACS)",
            "issuing_authority": "GDACS / UN OCHA",
            "source_identifier": "GDACS_FL_1001",
            "is_official": True,
            "affected_locations": "Assam, India",
            "issue_time": now.isoformat(),
            "valid_until": valid_future,
            "trigger_reason": "Satellite hydrological surge detection confirmed overbank breach.",
        }
    ]

    result = service.sync_official_warnings(test_db, warnings_override=sample_official_warnings)
    assert result["status"] == "success"
    assert result["ingested"] == 1

    # Verify stored record
    stored = test_db.query(Alert).filter(Alert.source_identifier == "GDACS_FL_1001").first()
    assert stored is not None
    assert stored.is_official is True
    assert stored.issuing_authority == "GDACS / UN OCHA"
    assert stored.status == "active"
    assert stored.severity == "critical"
    assert stored.affected_locations == "Assam, India"
    assert "Brahmaputra" in stored.message


# =====================================================================
# 2. Expiry Handling Tests
# =====================================================================

def test_expired_warnings_handling(test_db):
    service = FloodIntelligenceService()
    past_time = datetime.utcnow() - timedelta(days=2)

    expired_warning = [
        {
            "alert_type": "flood",
            "severity": "high",
            "message": "CWC FLOOD ADVISORY: Flash runoff subsided.",
            "data_source": "Central Water Commission",
            "issuing_authority": "Central Water Commission (CWC)",
            "source_identifier": "CWC_WARN_EXP_99",
            "is_official": True,
            "affected_locations": "Odisha, India",
            "issue_time": (past_time - timedelta(days=1)).isoformat(),
            "valid_until": past_time,
            "trigger_reason": "Subsided river swell.",
        }
    ]

    service.sync_official_warnings(test_db, warnings_override=expired_warning)

    # Stored record should be marked expired
    stored = test_db.query(Alert).filter(Alert.source_identifier == "CWC_WARN_EXP_99").first()
    assert stored is not None
    assert stored.status == "expired"

    # Active-only query must exclude it
    active_warnings = service.get_official_warnings(test_db, active_only=True)
    source_ids = [w["source_identifier"] for w in active_warnings]
    assert "CWC_WARN_EXP_99" not in source_ids

    # Query with include_expired=True includes it
    all_warnings = service.get_official_warnings(test_db, active_only=False)
    all_source_ids = [w["source_identifier"] for w in all_warnings]
    assert "CWC_WARN_EXP_99" in all_source_ids


# =====================================================================
# 3. Duplicate Prevention (Idempotency)
# =====================================================================

def test_duplicate_prevention_on_repeated_sync(test_db):
    service = FloodIntelligenceService()
    future_time = datetime.utcnow() + timedelta(days=1)

    warning_data = [
        {
            "alert_type": "flood",
            "severity": "high",
            "message": "GDACS ORANGE WARNING: Heavy monsoon inundation in Godavari delta.",
            "data_source": "Global Disaster Alert & Coordination System (GDACS)",
            "issuing_authority": "GDACS",
            "source_identifier": "GDACS_FL_IDEMPOTENT_1",
            "is_official": True,
            "affected_locations": "Andhra Pradesh",
            "valid_until": future_time,
        }
    ]

    # Ingest first time
    res1 = service.sync_official_warnings(test_db, warnings_override=warning_data)
    assert res1["ingested"] == 1
    assert res1["updated"] == 0

    # Ingest second time with exact same source_identifier
    res2 = service.sync_official_warnings(test_db, warnings_override=warning_data)
    assert res2["ingested"] == 0
    assert res2["updated"] == 1

    # Verify only 1 record exists in database
    count = test_db.query(Alert).filter(Alert.source_identifier == "GDACS_FL_IDEMPOTENT_1").count()
    assert count == 1


# =====================================================================
# 4. Source Failure Resilience (No Synthetic Fabrication)
# =====================================================================

def test_source_failure_graceful_handling(test_db, monkeypatch):
    class BrokenAlertProvider(AlertProvider):
        def fetch_official_alerts(self):
            raise ConnectionError("GDACS server timeout")

    service = FloodIntelligenceService(provider=BrokenAlertProvider())
    res = service.sync_official_warnings(test_db)

    assert res["status"] == "source_unavailable"
    assert res["ingested"] == 0
    assert "timeout" in res["error"]
    assert "disclaimer" in res


# =====================================================================
# 5. River Flood Stage Evaluation Tests
# =====================================================================

def test_river_flood_status_evaluation(test_db):
    # Add a breached river and a normal river
    r_breached = River(
        name="Brahmaputra at Guwahati",
        river_level=51.2,
        danger_level=49.68,
        flow_rate=12500.0,
        trend="Rising",
        latitude=26.18,
        longitude=91.75,
        data_source="CWC Telemetry Gauge",
        data_status="Observed",
    )
    r_normal = River(
        name="Cauvery at Grand Anicut",
        river_level=2.5,
        danger_level=6.0,
        flow_rate=450.0,
        trend="Steady",
        latitude=10.83,
        longitude=78.81,
        data_source="CWC Telemetry Gauge",
        data_status="Observed",
    )
    test_db.add_all([r_breached, r_normal])
    test_db.commit()

    service = FloodIntelligenceService()
    report = service.get_river_flood_status(test_db)

    assert report["monitored_stations_count"] >= 2
    stations = {s["name"]: s for s in report["stations"]}

    assert stations["Brahmaputra at Guwahati"]["fluvial_status"] == "Breached Danger Level"
    assert stations["Brahmaputra at Guwahati"]["severity"] == "critical"

    assert stations["Cauvery at Grand Anicut"]["fluvial_status"] == "Normal Fluvial Range"
    assert stations["Cauvery at Grand Anicut"]["severity"] == "safe"


# =====================================================================
# 6. Separation of Official Warnings and Platform Estimates
# =====================================================================

def test_transparent_risk_indicator_separation(test_db):
    service = FloodIntelligenceService()
    r = test_db.query(River).filter(River.name == "Brahmaputra at Guwahati").first()

    assessment = service.evaluate_flood_risk_indicator(
        test_db,
        river_id=r.id,
        forecast_rain_24h_mm=65.0,
    )

    # Must be clearly flagged as unofficial platform indicator
    assert assessment["is_official"] is False
    assert assessment["is_risk_indicator"] is True
    assert "risk_score" in assessment
    assert "component_breakdown" in assessment

    # Must include mandatory limitations and disclaimers
    assert any("Rainfall forecasts alone do not prove" in lim for lim in assessment["limitations"])
    assert any("water-shortage depletion model" in lim for lim in assessment["limitations"])
    assert "NDMA" in assessment["disclaimer"]


# =====================================================================
# 7. Flood Intelligence API Endpoints
# =====================================================================

def test_api_official_warnings_endpoint(client):
    res = client.get("/api/v1/flood-intelligence/official-warnings?active_only=true")
    assert res.status_code == 200
    data = res.json()
    assert "warnings" in data
    assert "disclaimer" in data
    assert "limitations" in data


def test_api_river_status_endpoint(client):
    res = client.get("/api/v1/flood-intelligence/river-status")
    assert res.status_code == 200
    data = res.json()
    assert "stations" in data
    assert "disclaimer" in data


def test_api_risk_assessment_endpoint(client):
    res = client.get("/api/v1/flood-intelligence/risk-assessment?forecast_rain_24h_mm=45.0")
    assert res.status_code == 200
    data = res.json()
    assert data["is_official"] is False
    assert data["is_risk_indicator"] is True
    assert "risk_score" in data
