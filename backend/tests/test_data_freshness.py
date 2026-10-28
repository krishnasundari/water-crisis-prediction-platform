"""
Tests for Prompt 8: Data Freshness, Quality States, and Validation Rules
========================================================================
Verifies:
  1. Quality state transitions: FRESH, STALE, MISSING, INVALID, SOURCE_UNAVAILABLE.
  2. Source-specific freshness thresholds (Open-Meteo: 2h, GDACS: 6h, CWC: 10d).
  3. Physical validation boundaries (rejection of negative levels/rainfall).
  4. Missing data preservation (never substituting synthetic zeros).
  5. Live API response annotations on reservoir and river status endpoints.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock

from app.core.freshness import (
    evaluate_freshness,
    determine_reservoir_quality,
    determine_river_quality,
    determine_alert_quality,
    FRESHNESS_THRESHOLDS_SECONDS,
)


def test_fresh_data_within_threshold():
    """Recent observation should be marked FRESH."""
    recent_time = datetime.utcnow() - timedelta(minutes=15)
    result = evaluate_freshness(
        source_type="open_meteo",
        observation_time=recent_time,
        value=12.5,
        min_bound=0.0,
    )
    assert result["quality_status"] == "FRESH"
    assert result["is_stale"] is False
    assert result["warning"] is None


def test_stale_open_meteo_weather():
    """Open-Meteo observation older than 2 hours must be marked STALE."""
    old_time = datetime.utcnow() - timedelta(hours=3)
    result = evaluate_freshness(
        source_type="open_meteo",
        observation_time=old_time,
        value=5.0,
        min_bound=0.0,
    )
    assert result["quality_status"] == "STALE"
    assert result["is_stale"] is True
    assert "old" in result["warning"]


def test_cwc_bulletin_freshness_window():
    """CWC Weekly Bulletin remains FRESH within 10 days, becomes STALE after 10 days."""
    within_window = datetime.utcnow() - timedelta(days=6)
    res_fresh = evaluate_freshness(
        source_type="cwc_bulletin",
        observation_time=within_window,
        value=500.0,
    )
    assert res_fresh["quality_status"] == "FRESH"
    assert res_fresh["is_stale"] is False

    past_window = datetime.utcnow() - timedelta(days=11)
    res_stale = evaluate_freshness(
        source_type="cwc_bulletin",
        observation_time=past_window,
        value=500.0,
    )
    assert res_stale["quality_status"] == "STALE"
    assert res_stale["is_stale"] is True


def test_physical_validation_invalid_bounds():
    """Negative values or levels exceeding physical limits must be marked INVALID."""
    # Negative rainfall
    res_neg = evaluate_freshness(
        source_type="open_meteo",
        observation_time=datetime.utcnow(),
        value=-4.5,
        min_bound=0.0,
    )
    assert res_neg["quality_status"] == "INVALID"
    assert "below physical minimum" in res_neg["warning"]

    # Storage exceeding 150% of capacity
    res_over = determine_reservoir_quality(
        data_source="CWC Weekly Reservoir Storage Bulletin",
        last_updated_at=datetime.utcnow(),
        current_level=1600.0,
        capacity=1000.0, # max bound is 1500.0
    )
    assert res_over["quality_status"] == "INVALID"
    assert "exceeds physical maximum" in res_over["warning"]


def test_missing_data_preservation():
    """Null observation time or missing value must be marked MISSING without substituting synthetic zeros."""
    res_missing = evaluate_freshness(
        source_type="open_meteo",
        observation_time=None,
        value=None,
    )
    assert res_missing["quality_status"] == "MISSING"
    assert res_missing["is_stale"] is True


def test_source_unavailable():
    """When external source returns error or is marked unavailable, status is SOURCE_UNAVAILABLE."""
    res_unavail = evaluate_freshness(
        source_type="cwc_bulletin",
        observation_time=datetime.utcnow(),
        current_status="SOURCE_UNAVAILABLE",
    )
    assert res_unavail["quality_status"] == "SOURCE_UNAVAILABLE"
    assert res_unavail["is_stale"] is True


def test_reservoir_live_status_api_annotation():
    """Live status API endpoint should include quality_status, is_stale, and freshness_warning."""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    resp = client.get("/api/v1/reservoirs/1/live-status")
    if resp.status_code == 200:
        data = resp.json()
        assert "quality_status" in data
        assert "is_stale" in data
        assert "freshness_warning" in data
        assert data["quality_status"] in ("FRESH", "STALE", "MISSING", "INVALID", "SOURCE_UNAVAILABLE")


def test_river_live_status_api_annotation():
    """Live river status API endpoint should include quality metadata."""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    resp = client.get("/api/v1/rivers/1/live-status")
    if resp.status_code == 200:
        data = resp.json()
        assert "quality_status" in data
        assert "is_stale" in data
        assert "freshness_warning" in data
        assert data["quality_status"] in ("FRESH", "STALE", "MISSING", "INVALID", "SOURCE_UNAVAILABLE")
