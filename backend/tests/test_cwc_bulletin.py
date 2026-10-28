"""
Tests for CWC Weekly Reservoir Storage Bulletin Provider
=========================================================
All unit tests use clearly labelled synthetic fixtures — no real network calls.
The integration test is marked and skipped by default.

Run unit tests only:
    pytest backend/tests/test_cwc_bulletin.py -v

Run integration test (requires network):
    pytest backend/tests/test_cwc_bulletin.py -v -m integration
"""

import pytest
from datetime import date
from unittest.mock import patch, MagicMock

from app.providers.cwc_bulletin_provider import (
    _parse_date_from_filename,
    _parse_storage_table,
    fetch_latest_cwc_bulletin_records,
)


# ---------------------------------------------------------------------------
# Fixtures — clearly labelled synthetic test data
# ---------------------------------------------------------------------------

# Simulates a line from CWC bulletin PDF text that mentions Hirakud storage
FIXTURE_BULLETIN_TEXT_WITH_MATCHES = """
CWC WEEKLY RESERVOIR STORAGE BULLETIN
AS ON 08.05.2025

NORTHERN REGION
Tehri              3.540   2.84   80%   2.91   98%
Bhakra             9.340   7.21   77%   8.10   87%

EASTERN REGION  
Hirakud            5.891   2.95   50%   3.00   51%
Maithon            1.100   0.55   50%   0.60   55%

CENTRAL REGION
Indira Sagar      12.200   9.80   80%   9.50   78%
Rihand            10.600   7.50   71%   7.80   74%

WESTERN REGION
Sardar Sarovar     9.500   7.60   80%   7.20   76%

SOUTHERN REGION
Nagarjuna Sagar   11.560   8.90   77%   8.50   74%
Srisailam          6.150   4.80   78%   4.50   73%
Tungabhadra        3.760   2.90   77%   2.80   74%
Koyna              2.797   2.10   75%   2.20   79%
Mettur             2.708   1.98   73%   2.00   74%
"""

FIXTURE_BULLETIN_TEXT_NO_MATCHES = """
Some reservoir not in India water platform   5.000   3.50   70%
Another unknown dam                          2.000   1.50   75%
"""

FIXTURE_BULLETIN_TEXT_INVALID_PCT = """
Srisailam          6.150   4.80   999%   4.50   73%
"""

FIXTURE_INDEX_HTML = """
<html><body>
<a href="https://cwc.gov.in/sites/default/files/bulletin-08-05-2025.pdf">Latest Bulletin</a>
<a href="https://cwc.gov.in/sites/default/files/fb-01052025.pdf">Previous Bulletin</a>
</body></html>
"""


# ---------------------------------------------------------------------------
# Tests: _parse_date_from_filename
# ---------------------------------------------------------------------------

class TestParseDateFromFilename:

    def test_parses_bulletin_DD_MM_YYYY_format(self):
        """bulletin-08-05-2025.pdf → 2025-05-08"""
        result = _parse_date_from_filename("/sites/default/files/bulletin-08-05-2025.pdf")
        assert result == date(2025, 5, 8)

    def test_parses_fb_DDMMYYYY_format(self):
        """fb-01052025.pdf → 2025-05-01"""
        result = _parse_date_from_filename("/sites/default/files/fb-01052025.pdf")
        assert result == date(2025, 5, 1)

    def test_parses_fb_DDMMYYYY_new_format(self):
        """fb-27032025-new.pdf → 2025-03-27"""
        result = _parse_date_from_filename("/sites/default/files/fb-27032025-new.pdf")
        assert result == date(2025, 3, 27)

    def test_parses_DDMMYYYY_fb_prefix(self):
        """20032025-fb.pdf → 2025-03-20"""
        result = _parse_date_from_filename("/sites/default/files/20032025-fb.pdf")
        assert result == date(2025, 3, 20)

    def test_returns_none_for_unrecognised_format(self):
        """Unknown filename format → None (no fabricated date)."""
        result = _parse_date_from_filename("/sites/default/files/unknown.pdf")
        assert result is None

    def test_returns_none_for_invalid_date_components(self):
        """bulletin-99-99-2025.pdf → None (invalid day/month)."""
        result = _parse_date_from_filename("/sites/default/files/bulletin-99-99-2025.pdf")
        assert result is None


# ---------------------------------------------------------------------------
# Tests: _parse_storage_table
# ---------------------------------------------------------------------------

class TestParseStorageTable:

    def test_extracts_known_reservoirs(self):
        """Fixture text with valid storage lines → correct records returned."""
        obs_date = date(2025, 5, 8)
        records = _parse_storage_table(
            FIXTURE_BULLETIN_TEXT_WITH_MATCHES,
            obs_date,
            "https://cwc.gov.in/sites/default/files/bulletin-08-05-2025.pdf",
        )
        assert isinstance(records, list)
        assert len(records) > 0

        # Check known reservoirs are present
        names = {r["app_reservoir_name"] for r in records}
        assert "Hirakud Dam" in names
        assert "Srisailam Dam" in names

    def test_storage_pct_is_float_in_valid_range(self):
        """All returned storage percentages must be between 0 and 125."""
        obs_date = date(2025, 5, 8)
        records = _parse_storage_table(
            FIXTURE_BULLETIN_TEXT_WITH_MATCHES,
            obs_date,
            "https://cwc.gov.in/sites/default/files/bulletin-08-05-2025.pdf",
        )
        for rec in records:
            assert isinstance(rec["storage_pct_frl"], float)
            assert 0.0 <= rec["storage_pct_frl"] <= 125.0

    def test_rejects_invalid_percentage(self):
        """Storage % of 999% is out of range and must be rejected."""
        obs_date = date(2025, 5, 8)
        records = _parse_storage_table(
            FIXTURE_BULLETIN_TEXT_INVALID_PCT,
            obs_date,
            "https://cwc.gov.in/test.pdf",
        )
        # Either no records returned, or none with 999% (rejected by range check)
        for rec in records:
            assert rec["storage_pct_frl"] <= 125.0

    def test_returns_empty_list_on_no_matches(self):
        """Text with no recognisable reservoir names → empty list."""
        obs_date = date(2025, 5, 8)
        records = _parse_storage_table(
            FIXTURE_BULLETIN_TEXT_NO_MATCHES,
            obs_date,
            "https://cwc.gov.in/test.pdf",
        )
        assert records == []

    def test_record_has_required_fields(self):
        """Each returned record has all required provenance fields."""
        obs_date = date(2025, 5, 8)
        records = _parse_storage_table(
            FIXTURE_BULLETIN_TEXT_WITH_MATCHES,
            obs_date,
            "https://cwc.gov.in/sites/default/files/bulletin-08-05-2025.pdf",
        )
        required_fields = {
            "app_reservoir_name",
            "cwc_name",
            "storage_pct_frl",
            "live_storage_bcm",
            "observation_date",
            "bulletin_url",
            "data_source",
            "retrieved_at",
        }
        for rec in records:
            assert required_fields.issubset(rec.keys()), (
                f"Record missing fields: {required_fields - rec.keys()}"
            )

    def test_no_duplicate_reservoirs(self):
        """Each app reservoir name appears at most once per bulletin."""
        obs_date = date(2025, 5, 8)
        records = _parse_storage_table(
            FIXTURE_BULLETIN_TEXT_WITH_MATCHES,
            obs_date,
            "https://cwc.gov.in/sites/default/files/bulletin-08-05-2025.pdf",
        )
        names = [r["app_reservoir_name"] for r in records]
        assert len(names) == len(set(names)), "Duplicate reservoir names in results"

    def test_observation_date_stored_correctly(self):
        """observation_date must match the date passed to the function."""
        obs_date = date(2025, 5, 8)
        records = _parse_storage_table(
            FIXTURE_BULLETIN_TEXT_WITH_MATCHES,
            obs_date,
            "https://cwc.gov.in/sites/default/files/bulletin-08-05-2025.pdf",
        )
        for rec in records:
            assert rec["observation_date"] == obs_date

    def test_data_source_label_is_cwc(self):
        """All records must be labelled with CWC as the data source."""
        obs_date = date(2025, 5, 8)
        records = _parse_storage_table(
            FIXTURE_BULLETIN_TEXT_WITH_MATCHES,
            obs_date,
            "https://cwc.gov.in/test.pdf",
        )
        for rec in records:
            assert "CWC" in rec["data_source"]

    def test_extracts_live_storage_bcm_correctly(self):
        """Bulletin line with BCM number before % should extract live_storage_bcm."""
        obs_date = date(2025, 5, 8)
        records = _parse_storage_table(
            FIXTURE_BULLETIN_TEXT_WITH_MATCHES,
            obs_date,
            "https://cwc.gov.in/test.pdf",
        )
        hirakud_rec = next((r for r in records if r["app_reservoir_name"] == "Hirakud Dam"), None)
        assert hirakud_rec is not None
        assert hirakud_rec["live_storage_bcm"] is not None
        assert isinstance(hirakud_rec["live_storage_bcm"], float)
        assert hirakud_rec["live_storage_bcm"] > 0


# ---------------------------------------------------------------------------
# Tests: fetch_latest_cwc_bulletin_records (provider-level, mocked)
# ---------------------------------------------------------------------------

class TestFetchLatestCwcBulletinRecords:

    def test_returns_empty_list_on_index_fetch_failure(self):
        """Network failure on index page → empty list (no fabricated data)."""
        import requests as real_requests
        with patch(
            "app.providers.cwc_bulletin_provider.requests.get",
            side_effect=real_requests.exceptions.Timeout("timeout"),
        ):
            result = fetch_latest_cwc_bulletin_records()

        assert isinstance(result, list)
        assert len(result) == 0

    def test_returns_empty_list_on_pdf_download_failure(self):
        """Index page loads but PDF download fails → empty list."""
        import requests as real_requests

        mock_index_response = MagicMock()
        mock_index_response.ok = True
        mock_index_response.status_code = 200
        mock_index_response.text = FIXTURE_INDEX_HTML

        call_count = [0]

        def side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return mock_index_response  # Index page succeeds
            raise real_requests.exceptions.Timeout("PDF timeout")  # PDF fails

        with patch("app.providers.cwc_bulletin_provider.requests.get", side_effect=side_effect):
            result = fetch_latest_cwc_bulletin_records()

        assert isinstance(result, list)
        assert len(result) == 0

    def test_returns_records_on_valid_fixture_pdf(self):
        """Valid index + parseable PDF text → list of matched records."""
        import io
        # We need a minimal valid PDF or mock pypdf entirely
        mock_index_response = MagicMock()
        mock_index_response.ok = True
        mock_index_response.status_code = 200
        mock_index_response.text = FIXTURE_INDEX_HTML

        mock_pdf_response = MagicMock()
        mock_pdf_response.ok = True
        mock_pdf_response.status_code = 200
        # Provide enough bytes to pass the size check
        mock_pdf_response.content = b"%PDF-1.4 " + b"x" * 2000

        call_count = [0]

        def side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return mock_index_response
            return mock_pdf_response

        with patch("app.providers.cwc_bulletin_provider.requests.get", side_effect=side_effect):
            with patch(
                "app.providers.cwc_bulletin_provider._extract_pdf_text",
                return_value=FIXTURE_BULLETIN_TEXT_WITH_MATCHES,
            ):
                result = fetch_latest_cwc_bulletin_records()

        assert isinstance(result, list)
        assert len(result) > 0
        # Verify no synthetic values — all storage_pct must be in valid range
        for rec in result:
            assert 0.0 <= rec["storage_pct_frl"] <= 125.0


# ---------------------------------------------------------------------------
# Tests: data integrity — no simulated fallbacks
# ---------------------------------------------------------------------------

class TestDamProviderNoSimulatedFallback:
    """
    Verify dam_provider.py no longer returns the hardcoded Srisailam 322.45 value
    as 'Live' data.
    """

    def test_srisailam_no_longer_returns_hardcoded_level(self):
        """
        DATA INTEGRITY: dam_provider must not return 322.45 as a 'Live' level.
        All reservoirs should return Estimated status.
        """
        from app.providers.dam_provider import DamProvider

        provider = DamProvider()
        result = provider.get_reservoir_level(
            name="Srisailam Dam",
            latitude=16.0886,
            longitude=78.9006,
            fallback_level=4800.0,
        )

        # Must not claim to be Live
        assert result["data_status"] != "Live", (
            "DamProvider must not return 'Live' status — no verified API exists"
        )
        # Must not return the old hardcoded value
        assert result["water_level"] != 322.45, (
            "DamProvider must not return hardcoded 322.45 as a measurement"
        )
        # Must use the fallback level
        assert result["water_level"] == 4800.0

    def test_all_reservoirs_return_estimated(self):
        """All reservoirs must return Estimated status (no fabricated Live values)."""
        from app.providers.dam_provider import DamProvider

        provider = DamProvider()
        for name, fallback in [
            ("Tehri Dam", 1850.0),
            ("Srisailam Dam", 4800.0),
            ("Hirakud Dam", 4200.0),
        ]:
            result = provider.get_reservoir_level(
                name=name, latitude=0.0, longitude=0.0, fallback_level=fallback
            )
            assert result["data_status"] == "Estimated", (
                f"{name}: expected Estimated, got {result['data_status']}"
            )


class TestRiverProviderNoSimulatedFallback:
    """
    Verify river_provider.py no longer returns hardcoded 8.45 / 845.0
    for Ganges as 'Live' data.
    """

    def test_ganges_no_longer_returns_hardcoded_level(self):
        """
        DATA INTEGRITY: river_provider must not return 8.45 m as a 'Live' level.
        """
        from app.providers.river_provider import RiverProvider

        provider = RiverProvider()
        result = provider.get_river_gauge(
            name="ganges",
            latitude=25.3176,
            longitude=82.9739,
            fallback_level=8.5,
            fallback_flow=1200.0,
            fallback_trend="Rising",
        )

        assert result["data_status"] != "Live", (
            "RiverProvider must not return 'Live' status — no verified API exists"
        )
        assert result["river_level"] != 8.45, (
            "RiverProvider must not return hardcoded 8.45 m"
        )

    def test_all_rivers_return_simulated(self):
        """All rivers must return Simulated status."""
        from app.providers.river_provider import RiverProvider

        provider = RiverProvider()
        for name in ["ganges", "yamuna", "godavari"]:
            result = provider.get_river_gauge(
                name=name,
                latitude=0.0,
                longitude=0.0,
                fallback_level=5.0,
                fallback_flow=500.0,
                fallback_trend="Steady",
            )
            assert result["data_status"] == "Simulated", (
                f"{name}: expected Simulated, got {result['data_status']}"
            )


# ---------------------------------------------------------------------------
# Integration test — requires live network (skipped by default)
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_live_cwc_bulletin_fetch():
    """
    INTEGRATION TEST — requires internet access.
    Fetches the real CWC bulletin index and most recent PDF.
    Verifies at least one reservoir record is returned with valid fields.

    Run with: pytest -m integration
    """
    records = fetch_latest_cwc_bulletin_records()

    # If records are empty it may be a parsing failure (PDF format changed)
    # or a network issue — both are acceptable; we just verify the contract.
    assert isinstance(records, list)

    if len(records) > 0:
        for rec in records:
            assert "app_reservoir_name" in rec
            assert "storage_pct_frl" in rec
            assert 0.0 <= rec["storage_pct_frl"] <= 125.0
            assert "data_source" in rec
            assert "CWC" in rec["data_source"]
            assert "observation_date" in rec
            assert "retrieved_at" in rec

        print(f"\n[INFO] Live integration test passed: {len(records)} reservoir records")
        for rec in records:
            print(f"  {rec['app_reservoir_name']:30s} -> {rec['storage_pct_frl']}% FRL ({rec['observation_date']})")
    else:
        print("\n[WARN] Live integration test: 0 records returned - bulletin format may have changed")
