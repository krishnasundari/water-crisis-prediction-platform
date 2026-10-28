"""
Automated Test Suite for Analytics and Reports (Prompt 17).
Validates:
- Historical rainfall and reservoir trends aggregation using actual database records.
- Location (district, reservoir_id) and date filtering.
- Standardized units: mm for rainfall, MCM for dams, metres for rivers.
- Honest missing-data reporting (has_data=False, value=None, no synthetic numbers).
- PDF and CSV report generation with generation timestamps, provenance, and filter parameters.
- API endpoints for analytics history-series and report export.
"""

import os
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.models.models import (
    RainfallRecord,
    Reservoir,
    ReservoirHistory,
    River,
    RiverHistory,
    Alert,
    Report,
)
from app.services.analytics_service import AnalyticsService, analytics_service
from app.utils.report_generator import generate_report

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
# 1. Historical Rainfall Trends & Aggregation
# =====================================================================

def test_rainfall_history_series_aggregation(test_db):
    now = datetime.utcnow()
    # First create a reservoir for foreign key constraint
    res = Reservoir(
        name="Gangapur Dam",
        district="Nashik",
        state="Maharashtra",
        latitude=19.9,
        longitude=73.7,
        capacity=200.0,
        current_level=150.0,
    )
    test_db.add(res)
    test_db.commit()

    # Add rainfall records for today and yesterday
    r1 = RainfallRecord(
        reservoir_id=res.id,
        district="Nashik",
        rainfall_amount=28.5,
        measurement_date=now - timedelta(hours=3),
    )
    r2 = RainfallRecord(
        reservoir_id=res.id,
        district="Nashik",
        rainfall_amount=14.0,
        measurement_date=now - timedelta(days=1, hours=2),
    )
    test_db.add_all([r1, r2])
    test_db.commit()

    service = AnalyticsService()
    series = service.get_history_series(test_db, category="rainfall", timeframe="daily", district="Nashik")

    assert len(series) == 7
    # Today's interval should reflect 28.5 mm
    today_item = series[-1]
    assert today_item["has_data"] is True
    assert today_item["rainfall"] == 28.5
    assert today_item["unit"] == "mm"

    # Yesterday's interval should reflect 14.0 mm
    yesterday_item = series[-2]
    assert yesterday_item["has_data"] is True
    assert yesterday_item["rainfall"] == 14.0

    # Earlier intervals with no records must have None (not fabricated numbers)
    empty_item = series[0]
    assert empty_item["has_data"] is False
    assert empty_item["rainfall"] is None


# =====================================================================
# 2. Reservoir Storage Trends & Units (MCM)
# =====================================================================

def test_reservoir_history_series_units_and_filtering(test_db):
    res = Reservoir(
        name="Koyna Hydro Dam",
        district="Satara",
        state="Maharashtra",
        latitude=17.40,
        longitude=73.75,
        capacity=2797.4,
        current_level=2150.0,
        data_source="Central Water Commission",
        data_status="Observed",
        last_updated_at=datetime.utcnow(),
    )
    test_db.add(res)
    test_db.commit()

    # Add historical snapshot
    h1 = ReservoirHistory(
        reservoir_id=res.id,
        water_level=2120.0,
        recorded_at=datetime.utcnow() - timedelta(days=2),
    )
    test_db.add(h1)
    test_db.commit()

    service = AnalyticsService()
    series = service.get_history_series(
        test_db,
        category="dams",
        timeframe="daily",
        reservoir_id=res.id,
    )

    assert len(series) == 7
    # Day -2 item
    day_minus_2 = series[-3]
    assert day_minus_2["has_data"] is True
    assert day_minus_2["water_level"] == 2120.0
    assert day_minus_2["unit"] == "MCM"

    # Today item
    today_item = series[-1]
    assert today_item["has_data"] is True
    assert today_item["water_level"] == 2150.0
    assert today_item["unit"] == "MCM"


# =====================================================================
# 3. Missing Data Coverage (No Fabricated Gaps)
# =====================================================================

def test_missing_data_coverage_honesty(test_db):
    service = AnalyticsService()
    # Query rainfall for an unmonitored district
    series = service.get_history_series(
        test_db,
        category="rainfall",
        timeframe="daily",
        district="NonExistentDistrict",
    )
    assert len(series) == 7
    # Every day must be honestly reported as missing
    for item in series:
        assert item["has_data"] is False
        assert item["rainfall"] is None
        assert "No recorded" in item["status"]


# =====================================================================
# 4. Report Generation (PDF & CSV with Units and Metadata)
# =====================================================================

def test_pdf_report_generation(test_db):
    title = "Test Hydrological Report"
    filters = {"district": "Satara"}
    filepath = generate_report("pdf", title, test_db, filters=filters)

    assert os.path.exists(filepath)
    assert filepath.endswith(".pdf")
    # Non-empty file
    assert os.path.getsize(filepath) > 1000

    # Cleanup
    if os.path.exists(filepath):
        os.remove(filepath)


def test_csv_report_generation_structure_and_units(test_db):
    title = "Test Telemetry Export"
    filters = {"district": "Satara"}
    filepath = generate_report("csv", title, test_db, filters=filters)

    assert os.path.exists(filepath)
    assert filepath.endswith(".csv")

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Must contain metadata and standardized units
    assert "HYDROLOGICAL INTELLIGENCE BRIEF" in content
    assert "Generated At" in content
    assert "RESERVOIR STORAGE TELEMETRY (UNITS: MCM)" in content
    assert "RIVER BASIN TELEMETRY (UNITS: METRES, M3/S)" in content
    assert "Live Storage (MCM)" in content
    assert "Satara" in content

    # Cleanup
    if os.path.exists(filepath):
        os.remove(filepath)


# =====================================================================
# 5. API Endpoints Integration
# =====================================================================

def test_api_analytics_history_series(client):
    res = client.get("/api/v1/analytics/history-series?category=rainfall&timeframe=daily")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 7
    assert "label" in data[0]


def test_api_report_generate_and_download(client):
    # Request CSV report generation
    payload = {
        "report_type": "csv",
        "filters": {"district": "Satara"},
        "include_predictions": True,
        "include_forecasts": True,
    }
    gen_res = client.post("/api/v1/reports/generate", json=payload)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert "report" in gen_data
    report_id = gen_data["report"]["id"]

    # Download report
    dl_res = client.get(f"/api/v1/reports/{report_id}/download")
    assert dl_res.status_code == 200
    assert "RESERVOIR STORAGE TELEMETRY (UNITS: MCM)" in dl_res.text

    # Delete report
    del_res = client.delete(f"/api/v1/reports/{report_id}")
    assert del_res.status_code == 200
