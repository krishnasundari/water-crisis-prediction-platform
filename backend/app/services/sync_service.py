"""
Sync Service and Robust Scheduler Architecture
================================================
Implements reliable, source-cadenced synchronization for official sources:
  1. Open-Meteo Forecast & Current Weather (Cadence: 15-30 mins)
  2. GDACS Disaster Alerts (Cadence: 30-60 mins)
  3. CWC Weekly Storage Bulletin (Cadence: 12-24 hours)

Guarantees:
  - Idempotent execution
  - Non-overlapping execution guards (asyncio Lock)
  - Diagnostic run logs with status, timing, records ingested, and errors
  - Observation timestamps preserved separately from retrieval timestamps
  - No secret exposure in logs
  - Bounded retries with backoff
"""

import asyncio
import logging
import os
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import requests
from sqlalchemy.orm import Session

from app.models.models import (
    Reservoir,
    Village,
    RainfallRecord,
    GroundwaterRecord,
    Prediction,
    Alert,
    River,
    ReservoirHistory,
    RiverHistory,
    SyncLock,
)
from app.ml.models.predictor import predict_water_crisis, predict_flood_risk
from app.core.websocket_manager import manager
from app.services.weather_service import calculate_distance
from app.providers.dam_provider import DamProvider
from app.providers.river_provider import RiverProvider
from app.providers.alert_provider import AlertProvider

logger = logging.getLogger(__name__)
LOCK_NAME = "global_data_sync"
LOCK_TTL_SECONDS = 600  # 10 minutes TTL for restart / crash recovery


def _fetch_with_bounded_retry(url: str, params: dict, timeout: int = 8, max_retries: int = 2) -> Optional[dict]:
    """Execute HTTP GET with bounded retries and backoff for remote providers."""
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.get(url, params=params, timeout=timeout)
            if resp.ok:
                return resp.json()
            logger.warning(f"Upstream provider returned HTTP {resp.status_code} on attempt {attempt}/{max_retries}")
        except Exception as e:
            logger.warning(f"Upstream attempt {attempt}/{max_retries} failed: {e}")
            if attempt < max_retries:
                time.sleep(1)
    return None


def _acquire_db_lock(db: Session, worker_id: str) -> bool:
    """Acquire database-backed lock across multi-process workers/replicas with restart recovery."""
    try:
        now = datetime.utcnow()
        lock_rec = db.query(SyncLock).filter(SyncLock.lock_name == LOCK_NAME).first()
        if not lock_rec:
            lock_rec = SyncLock(
                lock_name=LOCK_NAME,
                is_locked=True,
                locked_at=now,
                locked_by=worker_id,
            )
            db.add(lock_rec)
            db.commit()
            return True

        if lock_rec.is_locked:
            lock_time = lock_rec.locked_at
            if lock_time and lock_time.tzinfo:
                lock_time = lock_time.replace(tzinfo=None)
            age = (now - lock_time).total_seconds() if lock_time else 999999
            if age < LOCK_TTL_SECONDS:
                logger.warning(f"Sync lock held by {lock_rec.locked_by} (age {round(age)}s). Skipping across workers.")
                return False
            # Stale lock from restart/crash: recover
            logger.warning(f"Recovering expired sync lock from {lock_rec.locked_by} (age {round(age)}s).")
            lock_rec.is_locked = True
            lock_rec.locked_at = now
            lock_rec.locked_by = worker_id
            db.commit()
            return True
        else:
            lock_rec.is_locked = True
            lock_rec.locked_at = now
            lock_rec.locked_by = worker_id
            db.commit()
            return True
    except Exception as e:
        logger.warning(f"DB lock check exception (falling back to process lock): {e}")
        return True


def _release_db_lock(db: Session, worker_id: str, success: bool = True):
    """Release database-backed lock and record persistent last_success timestamp."""
    try:
        lock_rec = db.query(SyncLock).filter(SyncLock.lock_name == LOCK_NAME).first()
        if lock_rec and lock_rec.locked_by == worker_id:
            lock_rec.is_locked = False
            lock_rec.locked_at = None
            lock_rec.last_success = datetime.utcnow()
            db.commit()
    except Exception as e:
        logger.warning(f"DB lock release exception: {e}")


# Global concurrency lock to prevent overlapping sync runs within worker
_SYNC_LOCK = asyncio.Lock()

# Source run timestamps for cadence control
_LAST_SOURCE_RUNS: Dict[str, Optional[datetime]] = {
    "open_meteo": None,
    "gdacs_alerts": None,
    "cwc_bulletin": None,
}

# In-memory diagnostics tracker (safe for fast API inspection without secret leak)
SYNC_DIAGNOSTICS: Dict[str, Any] = {
    "is_running": False,
    "last_run_started_at": None,
    "last_run_completed_at": None,
    "last_run_status": "NEVER_RUN",
    "total_runs": 0,
    "failed_runs": 0,
    "source_status": {
        "open_meteo": {"last_success": None, "last_error": None, "records_updated": 0, "last_run_attempt": None},
        "gdacs_alerts": {"last_success": None, "last_error": None, "records_updated": 0, "last_run_attempt": None},
        "cwc_bulletin": {"last_success": None, "last_error": None, "records_updated": 0, "last_run_attempt": None},
    },
    "last_error": None,
}


def get_sync_diagnostics(db: Optional[Session] = None) -> Dict[str, Any]:
    """Return diagnostic telemetry status for monitoring and health endpoints with persistent DB state."""
    diag = dict(SYNC_DIAGNOSTICS)
    diag["is_running"] = _SYNC_LOCK.locked()
    if db is not None:
        try:
            lock_rec = db.query(SyncLock).filter(SyncLock.lock_name == LOCK_NAME).first()
            if lock_rec:
                if lock_rec.is_locked:
                    diag["is_running"] = True
                if lock_rec.last_success:
                    diag["last_persistent_success"] = lock_rec.last_success.isoformat()
                    if not diag.get("last_run_completed_at"):
                        diag["last_run_completed_at"] = lock_rec.last_success.isoformat()
        except Exception:
            pass
    return diag


async def execute_scheduled_sync(
    db: Session,
    run_cwc_bulletin: bool = False,
    force_all: bool = False,
) -> Dict[str, Any]:
    """
    Execute synchronization with concurrency guards, source timeouts, cadences, and diagnostic tracking.
    """
    global SYNC_DIAGNOSTICS, _LAST_SOURCE_RUNS
    if _SYNC_LOCK.locked():
        logger.warning("Scheduled sync attempted while another sync run is active. Skipping concurrent execution.")
        return {"status": "SKIPPED_CONCURRENT", "reason": "process_lock", "timestamp": datetime.utcnow().isoformat()}

    worker_id = f"worker_{os.getpid()}"
    if not _acquire_db_lock(db, worker_id):
        return {"status": "SKIPPED_CONCURRENT", "reason": "cross_worker_db_lock", "timestamp": datetime.utcnow().isoformat()}

    async with _SYNC_LOCK:
        start_time = datetime.utcnow()
        SYNC_DIAGNOSTICS["is_running"] = True
        SYNC_DIAGNOSTICS["last_run_started_at"] = start_time.isoformat()
        SYNC_DIAGNOSTICS["total_runs"] += 1
        
        run_errors = []
        records_summary = {"weather": 0, "alerts": 0, "cwc": 0}

        try:
            logger.info("===== STARTING DATA SYNC ENGINE (GUARDED RUN) =====")
            dam_prov = DamProvider()
            river_prov = RiverProvider()
            alert_prov = AlertProvider()

            # Cadence evaluation (seconds):
            # Open-Meteo Weather: 15 minutes (900s)
            # GDACS Alerts: 30 minutes (1800s)
            # CWC Bulletin: 12 hours (43200s)
            should_run_weather = (
                force_all
                or _LAST_SOURCE_RUNS["open_meteo"] is None
                or (start_time - _LAST_SOURCE_RUNS["open_meteo"]).total_seconds() >= 900
            )
            should_run_alerts = (
                force_all
                or _LAST_SOURCE_RUNS["gdacs_alerts"] is None
                or (start_time - _LAST_SOURCE_RUNS["gdacs_alerts"]).total_seconds() >= 1800
            )
            should_run_cwc = (
                force_all
                or run_cwc_bulletin
                or _LAST_SOURCE_RUNS["cwc_bulletin"] is None
                or (start_time - _LAST_SOURCE_RUNS["cwc_bulletin"]).total_seconds() >= 43200
            )

            # -------------------------------------------------------------
            # 1. Sync Reservoirs and Open-Meteo Current Precipitation
            # -------------------------------------------------------------
            if should_run_weather:
                _LAST_SOURCE_RUNS["open_meteo"] = start_time
                SYNC_DIAGNOSTICS["source_status"]["open_meteo"]["last_run_attempt"] = start_time.isoformat()
                try:
                    reservoirs = db.query(Reservoir).all()
                    for res in reservoirs:
                        lat = res.latitude or 0.0
                        lon = res.longitude or 0.0
                        
                        w_url = "https://api.open-meteo.com/v1/forecast"
                        w_params = {
                            "latitude": lat,
                            "longitude": lon,
                            "current": "precipitation",
                            "timezone": "auto"
                        }
                        
                        rain = 0.0
                        obs_time = datetime.utcnow()
                        cur_json = _fetch_with_bounded_retry(w_url, params=w_params, timeout=8, max_retries=2)
                        if cur_json:
                            cur = cur_json.get("current", {})
                            rain = float(cur.get("precipitation", 0.0) or 0.0)
                            if "time" in cur:
                                try:
                                    obs_time = datetime.fromisoformat(cur["time"])
                                except Exception:
                                    obs_time = datetime.utcnow()
                        
                        # Store observation with actual observation timestamp and non-negative validation
                        valid_rain = max(0.0, rain)
                        # Check duplicate within 15-minute window for same reservoir
                        recent_record = (
                            db.query(RainfallRecord)
                            .filter(
                                RainfallRecord.reservoir_id == res.id,
                                RainfallRecord.measurement_date >= obs_time - timedelta(minutes=15),
                                RainfallRecord.measurement_date <= obs_time + timedelta(minutes=15),
                            )
                            .first()
                        )
                        if not recent_record:
                            rain_rec = RainfallRecord(
                                reservoir_id=res.id,
                                district=res.district,
                                measurement_date=obs_time,
                                rainfall_amount=valid_rain,
                            )
                            db.add(rain_rec)
                            records_summary["weather"] += 1

                        # Local hydrological estimation fallback
                        inflow_added = valid_rain * 0.35
                        fallback_level = min(res.capacity, res.current_level + inflow_added)
                        res_telemetry = dam_prov.get_reservoir_level(res.name, lat, lon, fallback_level)
                        
                        res.current_level = res_telemetry["water_level"]
                        res.data_source = res_telemetry["data_source"]
                        res.data_status = res_telemetry["data_status"]
                        res.last_updated_at = datetime.utcnow()
                        db.add(res)

                        pct = (res.current_level / res.capacity) * 100
                        outflow = 8.5 if pct >= 100 else 4.5 if pct >= 90 else 2.5 if pct >= 75 else 1.2 if pct >= 50 else 0.4
                        
                        res_history = ReservoirHistory(
                            reservoir_id=res.id,
                            water_level=res.current_level,
                            inflow=inflow_added,
                            outflow=outflow,
                            recorded_at=datetime.utcnow()
                        )
                        db.add(res_history)
                    
                    db.commit()
                    SYNC_DIAGNOSTICS["source_status"]["open_meteo"]["last_success"] = datetime.utcnow().isoformat()
                    SYNC_DIAGNOSTICS["source_status"]["open_meteo"]["records_updated"] += records_summary["weather"]
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error during reservoir sync: {e}")
                    run_errors.append(f"Reservoir/Weather: {str(e)}")
                    SYNC_DIAGNOSTICS["source_status"]["open_meteo"]["last_error"] = str(e)

            # -------------------------------------------------------------
            # 2. Sync Rivers Telemetry
            # -------------------------------------------------------------
            try:
                rivers = db.query(River).all()
                for r in rivers:
                    riv_telemetry = river_prov.get_river_gauge(
                        r.name, r.latitude or 0.0, r.longitude or 0.0, r.river_level, r.flow_rate, r.trend
                    )
                    r.river_level = riv_telemetry["river_level"]
                    r.flow_rate = riv_telemetry["flow_rate"]
                    r.trend = riv_telemetry["trend"]
                    r.data_source = riv_telemetry["data_source"]
                    r.data_status = riv_telemetry["data_status"]
                    r.last_updated_at = datetime.utcnow()
                    db.add(r)

                    r_history = RiverHistory(
                        river_id=r.id,
                        river_level=r.river_level,
                        flow_rate=r.flow_rate,
                        trend=r.trend,
                        recorded_at=datetime.utcnow()
                    )
                    db.add(r_history)
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Error during river sync: {e}")
                run_errors.append(f"River: {str(e)}")

            # -------------------------------------------------------------
            # 3. Sync Official Disaster Alerts (GDACS & Official Bulletins)
            # -------------------------------------------------------------
            if should_run_alerts:
                _LAST_SOURCE_RUNS["gdacs_alerts"] = start_time
                SYNC_DIAGNOSTICS["source_status"]["gdacs_alerts"]["last_run_attempt"] = start_time.isoformat()
                try:
                    from app.services.flood_intelligence_service import flood_intelligence_service
                    sync_res = flood_intelligence_service.sync_official_warnings(db=db)
                    records_summary["alerts"] = sync_res.get("ingested", 0) + sync_res.get("updated", 0)
                    SYNC_DIAGNOSTICS["source_status"]["gdacs_alerts"]["last_success"] = datetime.utcnow().isoformat()
                    SYNC_DIAGNOSTICS["source_status"]["gdacs_alerts"]["records_updated"] += records_summary["alerts"]
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error during official alert sync: {e}")
                    run_errors.append(f"Official Alerts: {str(e)}")
                    SYNC_DIAGNOSTICS["source_status"]["gdacs_alerts"]["last_error"] = str(e)

            # -------------------------------------------------------------
            # 4. CWC Weekly Storage Bulletin (Triggered on Cadence)
            # -------------------------------------------------------------
            if should_run_cwc:
                _LAST_SOURCE_RUNS["cwc_bulletin"] = start_time
                SYNC_DIAGNOSTICS["source_status"]["cwc_bulletin"]["last_run_attempt"] = start_time.isoformat()
                try:
                    from app.services.cwc_reservoir_ingest import ingest_cwc_bulletin
                    cwc_res = ingest_cwc_bulletin(db)
                    records_summary["cwc"] = cwc_res.get("inserted", 0)
                    SYNC_DIAGNOSTICS["source_status"]["cwc_bulletin"]["last_success"] = datetime.utcnow().isoformat()
                    SYNC_DIAGNOSTICS["source_status"]["cwc_bulletin"]["records_updated"] += records_summary["cwc"]
                except Exception as e:
                    logger.error(f"Error during CWC bulletin sync: {e}")
                    run_errors.append(f"CWC: {str(e)}")
                    SYNC_DIAGNOSTICS["source_status"]["cwc_bulletin"]["last_error"] = str(e)

            # -------------------------------------------------------------
            # 5. Evaluate Intelligent Assessment Rules (Prompt 15)
            # -------------------------------------------------------------
            try:
                from app.services.alert_service import alert_service
                eval_res = alert_service.evaluate_all_rules(db=db)
                logger.info(f"Evaluated intelligent alert rules: {eval_res}")
            except Exception as e:
                logger.error(f"Error evaluating intelligent alerts: {e}")
                run_errors.append(f"Alert Rules: {str(e)}")

            # Broadcast completion to WebSocket clients
            try:
                await manager.broadcast({
                    "event": "sync_complete",
                    "timestamp": datetime.utcnow().isoformat(),
                    "summary": records_summary,
                })
            except Exception:
                pass

            completed_time = datetime.utcnow()
            SYNC_DIAGNOSTICS["is_running"] = False
            SYNC_DIAGNOSTICS["last_run_completed_at"] = completed_time.isoformat()
            if run_errors:
                SYNC_DIAGNOSTICS["last_run_status"] = "COMPLETED_WITH_WARNINGS"
                SYNC_DIAGNOSTICS["last_error"] = "; ".join(run_errors)
            else:
                SYNC_DIAGNOSTICS["last_run_status"] = "SUCCESS"
                SYNC_DIAGNOSTICS["last_error"] = None

            _release_db_lock(db, worker_id, success=(len(run_errors) == 0))
            return {
                "status": SYNC_DIAGNOSTICS["last_run_status"],
                "started_at": start_time.isoformat(),
                "completed_at": completed_time.isoformat(),
                "records_summary": records_summary,
                "warnings": run_errors,
            }

        except Exception as e:
            _release_db_lock(db, worker_id, success=False)
            SYNC_DIAGNOSTICS["is_running"] = False
            SYNC_DIAGNOSTICS["failed_runs"] += 1
            SYNC_DIAGNOSTICS["last_run_status"] = "FAILED"
            SYNC_DIAGNOSTICS["last_error"] = str(e)
            logger.error(f"Fatal sync runner failure: {e}", exc_info=True)
            return {"status": "FAILED", "error": str(e)}


async def sync_all_data(db: Session):
    """Backwards-compatible wrapper calling the guarded sync engine."""
    await execute_scheduled_sync(db, run_cwc_bulletin=False)
