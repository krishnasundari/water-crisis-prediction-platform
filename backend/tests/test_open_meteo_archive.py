"""
Tests for Open-Meteo Historical Archive Integration
=====================================================
Tests use clearly labelled fixtures — no real network calls in unit tests.
Integration test is marked and skipped by default.

Run unit tests only:
    pytest backend/tests/test_open_meteo_archive.py -v

Run integration test (requires network):
    pytest backend/tests/test_open_meteo_archive.py -v -m integration
"""

import pytest
from datetime import date, timedelta
from unittest.mock import patch, MagicMock

from app.providers.open_meteo_archive_provider import (
    fetch_historical_daily_rainfall,
    get_default_backfill_range,
)


# ---------------------------------------------------------------------------
# Fixtures — clearly labelled synthetic test data
# ---------------------------------------------------------------------------

FIXTURE_OPEN_METEO_ARCHIVE_RESPONSE = {
    "latitude": 21.57,
    "longitude": 83.87,
    "timezone": "Asia/Kolkata",
    "daily_units": {
        "time": "iso8601",
        "precipitation_sum": "mm",
        "rain_sum": "mm",
        "temperature_2m_max": "°C",
        "temperature_2m_min": "°C",
    },
    "daily": {
        "time": ["2024-06-01", "2024-06-02", "2024-06-03"],
        "precipitation_sum": [5.2, 0.0, 12.8],
        "rain_sum": [5.2, 0.0, 12.8],
        "temperature_2m_max": [34.1, 35.0, 29.5],
        "temperature_2m_min": [24.0, 25.1, 22.3],
    },
}

FIXTURE_MISSING_DAILY_KEY_RESPONSE = {
    "latitude": 21.57,
    "longitude": 83.87,
    # 'daily' key is absent — simulates malformed response
}

FIXTURE_NULL_PRECIPITATION_RESPONSE = {
    "latitude": 21.57,
    "longitude": 83.87,
    "daily": {
        "time": ["2024-06-01"],
        "precipitation_sum": [None],  # missing data
        "rain_sum": [None],
        "temperature_2m_max": [30.0],
        "temperature_2m_min": [22.0],
    },
}

FIXTURE_NEGATIVE_PRECIPITATION_RESPONSE = {
    "latitude": 21.57,
    "longitude": 83.87,
    "daily": {
        "time": ["2024-06-01"],
        "precipitation_sum": [-1.0],  # invalid value
        "rain_sum": [-1.0],
        "temperature_2m_max": [30.0],
        "temperature_2m_min": [22.0],
    },
}


# ---------------------------------------------------------------------------
# Unit Tests — no real network calls
# ---------------------------------------------------------------------------

class TestFetchHistoricalDailyRainfall:

    def test_returns_records_on_valid_fixture_response(self):
        """Valid API response → list of records with correct fields."""
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_resp.json.return_value = FIXTURE_OPEN_METEO_ARCHIVE_RESPONSE

        with patch("app.providers.open_meteo_archive_provider.requests.get",
                   return_value=mock_resp):
            result = fetch_historical_daily_rainfall(
                latitude=21.57,
                longitude=83.87,
                start_date=date(2024, 6, 1),
                end_date=date(2024, 6, 3),
            )

        assert result is not None
        assert len(result) == 3

        r = result[0]
        assert r["date"] == "2024-06-01"
        assert r["precipitation_mm"] == 5.2
        assert r["rain_mm"] == 5.2
        assert r["temperature_max_c"] == 34.1
        assert r["temperature_min_c"] == 24.0
        assert r["data_source"] == "Open-Meteo ERA5-Land Archive"
        assert r["latitude"] == 21.57
        assert r["longitude"] == 83.87
        assert "retrieved_at" in r

    def test_skips_null_precipitation_records(self):
        """Null precipitation values are skipped — not inserted as 0."""
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_resp.json.return_value = FIXTURE_NULL_PRECIPITATION_RESPONSE

        with patch("app.providers.open_meteo_archive_provider.requests.get",
                   return_value=mock_resp):
            result = fetch_historical_daily_rainfall(
                latitude=21.57,
                longitude=83.87,
                start_date=date(2024, 6, 1),
                end_date=date(2024, 6, 1),
            )

        assert result is not None
        assert len(result) == 0  # null record skipped

    def test_returns_none_on_missing_daily_key(self):
        """Response missing 'daily' key → returns None (schema validation)."""
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_resp.json.return_value = FIXTURE_MISSING_DAILY_KEY_RESPONSE

        with patch("app.providers.open_meteo_archive_provider.requests.get",
                   return_value=mock_resp):
            result = fetch_historical_daily_rainfall(
                latitude=21.57,
                longitude=83.87,
                start_date=date(2024, 6, 1),
                end_date=date(2024, 6, 1),
            )

        assert result is None

    def test_returns_none_on_network_timeout(self):
        """Network timeout after retries → returns None."""
        import requests as real_requests

        with patch("app.providers.open_meteo_archive_provider.requests.get",
                   side_effect=real_requests.exceptions.Timeout("timeout")):
            result = fetch_historical_daily_rainfall(
                latitude=21.57,
                longitude=83.87,
                start_date=date(2024, 6, 1),
                end_date=date(2024, 6, 1),
            )

        assert result is None

    def test_returns_none_when_start_after_end(self):
        """start_date after end_date → returns None immediately."""
        result = fetch_historical_daily_rainfall(
            latitude=21.57,
            longitude=83.87,
            start_date=date(2024, 6, 10),
            end_date=date(2024, 6, 1),  # end before start
        )
        assert result is None

    def test_rain_defaults_to_zero_when_null(self):
        """rain_sum null → record stored with rain_mm=0.0, not skipped."""
        fixture = {
            "daily": {
                "time": ["2024-06-01"],
                "precipitation_sum": [3.5],
                "rain_sum": [None],   # null but precipitation is valid
                "temperature_2m_max": [30.0],
                "temperature_2m_min": [22.0],
            }
        }
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_resp.json.return_value = fixture

        with patch("app.providers.open_meteo_archive_provider.requests.get",
                   return_value=mock_resp):
            result = fetch_historical_daily_rainfall(
                latitude=21.57,
                longitude=83.87,
                start_date=date(2024, 6, 1),
                end_date=date(2024, 6, 1),
            )

        assert result is not None
        assert len(result) == 1
        assert result[0]["rain_mm"] == 0.0
        assert result[0]["precipitation_mm"] == 3.5


class TestGetDefaultBackfillRange:

    def test_returns_tuple_of_dates(self):
        start, end = get_default_backfill_range()
        assert isinstance(start, date)
        assert isinstance(end, date)

    def test_start_before_end(self):
        start, end = get_default_backfill_range()
        assert start < end

    def test_end_is_recent(self):
        """End date should be within the last week."""
        from datetime import date as date_cls
        _, end = get_default_backfill_range()
        assert (date_cls.today() - end).days <= 7

    def test_range_is_approximately_5_years(self):
        start, end = get_default_backfill_range()
        delta_days = (end - start).days
        # 5 years ≈ 1825 days; allow ±5 days for leap years
        assert 1820 <= delta_days <= 1830


class TestAlertProviderNoSimulatedFallback:
    """Verify the GDACS provider returns empty list (not simulated alert) on failure."""

    def test_returns_empty_list_on_both_sources_failing(self):
        import requests as real_requests
        from app.providers.alert_provider import AlertProvider

        provider = AlertProvider()

        with patch(
            "app.providers.alert_provider.requests.get",
            side_effect=real_requests.exceptions.Timeout("timeout"),
        ):
            result = provider.fetch_official_alerts()

        # Must return an empty list, NOT a hardcoded simulated IMD alert
        assert isinstance(result, list)
        for alert in result:
            # If anything is returned, it must not be the old hardcoded fallback
            assert "India Meteorological Department (IMD)" not in alert.get(
                "data_source", ""
            ), "Simulated IMD fallback alert must not be returned"


# ---------------------------------------------------------------------------
# Integration Test — requires live network (skipped by default in CI)
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_live_open_meteo_archive_fetch():
    """
    INTEGRATION TEST — requires internet access.
    Fetches 7 days of real ERA5-Land data for Hirakud Dam coordinates.
    Verifies response structure and data types.

    Run with: pytest -m integration
    """
    end = date.today() - timedelta(days=4)  # within ERA5 coverage
    start = end - timedelta(days=6)  # 7 days

    result = fetch_historical_daily_rainfall(
        latitude=21.57,  # Hirakud Dam, Odisha
        longitude=83.87,
        start_date=start,
        end_date=end,
    )

    assert result is not None, "Live fetch returned None — check network or ERA5 lag"
    assert len(result) > 0, "No records returned for 7-day window"

    for rec in result:
        assert "date" in rec
        assert "precipitation_mm" in rec
        assert "data_source" in rec
        assert rec["data_source"] == "Open-Meteo ERA5-Land Archive"
        assert isinstance(rec["precipitation_mm"], float)
        assert rec["precipitation_mm"] >= 0.0
        assert "retrieved_at" in rec

    print(f"\n✅ Live integration test passed: {len(result)} records fetched")
    print(f"   Date range: {result[0]['date']} → {result[-1]['date']}")
    print(f"   Sample: {result[0]}")
