"""
Tests for Prompt 7: Automatic Sync & Scheduler Architecture
=============================================================
Verifies:
  1. Concurrency lock prevents overlapping synchronization runs.
  2. Diagnostic interface exposes telemetry safely without secrets.
  3. Provider error isolation (failures do not crash sync loop).
  4. Observation timestamps are tracked separately from retrieval time.
  5. Idempotent duplicate prevention within sliding time windows.
  6. Admin sync status and trigger endpoints require admin role.
"""

import asyncio
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.models import Reservoir, RainfallRecord, User, Role
from app.services.sync_service import (
    execute_scheduled_sync,
    get_sync_diagnostics,
    _SYNC_LOCK,
    SYNC_DIAGNOSTICS,
)


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed test reservoir
        res = Reservoir(
            name="KRISHNARAJA SAGARA",
            district="Mandya",
            state="Karnataka",
            latitude=12.26,
            longitude=76.57,
            capacity=1387.0,
            current_level=800.0,
        )
        db.add(res)
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.mark.asyncio
async def test_concurrency_lock_prevents_overlap(test_db):
    """If a sync run is currently active, a second invocation must be skipped cleanly."""
    # Acquire lock manually to simulate active run
    async with _SYNC_LOCK:
        result = await execute_scheduled_sync(test_db, force_all=True)
        assert result.get("status") == "SKIPPED_CONCURRENT"
        assert "timestamp" in result


def test_get_sync_diagnostics_structure():
    """Diagnostics dict must report telemetry fields without sensitive data."""
    diag = get_sync_diagnostics()
    assert "is_running" in diag
    assert "last_run_status" in diag
    assert "total_runs" in diag
    assert "source_status" in diag
    assert "open_meteo" in diag["source_status"]
    assert "gdacs_alerts" in diag["source_status"]
    assert "cwc_bulletin" in diag["source_status"]
    
    # Verify no credentials or auth tokens exist in diagnostics
    diag_str = str(diag).lower()
    assert "secret" not in diag_str
    assert "password" not in diag_str
    assert "token" not in diag_str


@pytest.mark.asyncio
async def test_observation_timestamp_distinct_from_retrieval(test_db):
    """Observation time from Open-Meteo must be preserved on RainfallRecord."""
    simulated_obs_time = (datetime.utcnow() - timedelta(hours=3)).replace(microsecond=0)
    mock_weather_response = {
        "current": {
            "time": simulated_obs_time.isoformat(),
            "precipitation": 14.5,
        }
    }

    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = mock_weather_response
        mock_get.return_value = mock_resp

        result = await execute_scheduled_sync(test_db, force_all=True)
        assert result.get("status") in ("SUCCESS", "COMPLETED_WITH_WARNINGS")

        # Verify rainfall record
        rec = test_db.query(RainfallRecord).first()
        assert rec is not None
        assert rec.rainfall_amount == 14.5
        # The measurement_date must match the simulated past observation time, not now
        assert abs((rec.measurement_date - simulated_obs_time).total_seconds()) < 2


@pytest.mark.asyncio
async def test_idempotency_duplicate_rainfall_prevention(test_db):
    """Calling sync twice within 15 minutes must not create duplicate rainfall rows."""
    obs_time = datetime.utcnow().replace(microsecond=0)
    mock_weather_response = {
        "current": {
            "time": obs_time.isoformat(),
            "precipitation": 5.0,
        }
    }

    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = mock_weather_response
        mock_get.return_value = mock_resp

        # First run
        res1 = await execute_scheduled_sync(test_db, force_all=True)
        count1 = test_db.query(RainfallRecord).count()
        assert count1 == 1

        # Second run with same observation time
        res2 = await execute_scheduled_sync(test_db, force_all=True)
        count2 = test_db.query(RainfallRecord).count()
        # Must not insert duplicate
        assert count2 == 1


@pytest.mark.asyncio
async def test_provider_failure_resilience(test_db):
    """When a remote provider throws an exception, sync must catch it, record warnings, and not crash."""
    with patch("requests.get", side_effect=Exception("Connection timed out")):
        result = await execute_scheduled_sync(test_db, force_all=True)
        # Should complete with warnings, not raise unhandled exception
        assert result.get("status") in ("COMPLETED_WITH_WARNINGS", "SUCCESS")
        diag = get_sync_diagnostics()
        assert diag["total_runs"] >= 1


def test_admin_sync_status_endpoint():
    """Admin sync status route must require admin authentication."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.api.routes.admin import _require_admin

    client = TestClient(app)

    # 1. Unauthenticated or non-admin call fails (401/403/422 without auth credentials)
    resp = client.get("/api/v1/admin/sync-status")
    assert resp.status_code in (401, 403, 422)

    # 2. Authenticated admin call succeeds
    mock_admin = MagicMock()
    mock_admin.username = "admin"
    mock_role = MagicMock()
    mock_role.name = "admin"
    mock_admin.role = mock_role

    app.dependency_overrides[_require_admin] = lambda: mock_admin
    try:
        admin_resp = client.get("/api/v1/admin/sync-status")
        assert admin_resp.status_code == 200
        data = admin_resp.json()
        assert data["status"] == "success"
        assert "diagnostics" in data
        assert "open_meteo" in data["diagnostics"]["source_status"]
    finally:
        app.dependency_overrides.pop(_require_admin, None)


@pytest.mark.asyncio
async def test_multi_worker_db_lock_concurrency(test_db):
    """Simulate multiple independent worker processes / replicas running sync concurrently."""
    from app.models.models import SyncLock
    from app.services.sync_service import LOCK_NAME

    # Simulate Worker A acquiring the DB lock
    lock = SyncLock(
        lock_name=LOCK_NAME,
        is_locked=True,
        locked_at=datetime.utcnow(),
        locked_by="worker_process_9999",
    )
    test_db.add(lock)
    test_db.commit()

    # Worker B tries to execute sync
    result = await execute_scheduled_sync(test_db, force_all=True)
    assert result.get("status") == "SKIPPED_CONCURRENT"
    assert result.get("reason") == "cross_worker_db_lock"


@pytest.mark.asyncio
async def test_stale_lock_restart_recovery(test_db):
    """Simulate application crash/restart with an unreleased stale DB lock (>10 min TTL)."""
    from app.models.models import SyncLock
    from app.services.sync_service import LOCK_NAME

    # Simulate dead worker lock from 20 minutes ago
    stale_time = datetime.utcnow() - timedelta(minutes=20)
    lock = SyncLock(
        lock_name=LOCK_NAME,
        is_locked=True,
        locked_at=stale_time,
        locked_by="crashed_worker_1234",
    )
    test_db.add(lock)
    test_db.commit()

    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {"current": {"time": datetime.utcnow().isoformat(), "precipitation": 0.0}}
        mock_get.return_value = mock_resp

        # New worker starts up and recovers the expired lock
        result = await execute_scheduled_sync(test_db, force_all=True)
        assert result.get("status") in ("SUCCESS", "COMPLETED_WITH_WARNINGS")

        # Verify lock was released upon completion and last_success was recorded
        updated_lock = test_db.query(SyncLock).filter(SyncLock.lock_name == LOCK_NAME).first()
        assert updated_lock is not None
        assert updated_lock.is_locked is False
        assert updated_lock.last_success is not None


def test_bounded_retries_upstream_failure():
    """Verify _fetch_with_bounded_retry attempts exactly bounded retries and handles failure cleanly."""
    from app.services.sync_service import _fetch_with_bounded_retry

    call_count = 0
    def mock_failing_get(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        raise Exception("Transient network timeout")

    with patch("requests.get", side_effect=mock_failing_get):
        with patch("time.sleep") as mock_sleep:
            res = _fetch_with_bounded_retry("https://api.open-meteo.com/v1/forecast", {}, max_retries=2)
            assert res is None
            assert call_count == 2
            assert mock_sleep.call_count == 1
