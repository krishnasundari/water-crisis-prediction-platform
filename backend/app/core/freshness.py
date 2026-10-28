"""
Data Freshness and Quality Evaluation Module
=============================================
Enforces source-specific freshness thresholds and physical validity constraints.

Quality States:
  - FRESH: Data is recent, valid, and within freshness threshold.
  - STALE: Observation timestamp exceeds the source-specific freshness threshold.
  - MISSING: Expected record or value is absent/null.
  - INVALID: Measurement violates physical boundaries (e.g., negative rainfall/storage).
  - SOURCE_UNAVAILABLE: External official provider is unreachable or errored.

Freshness Thresholds:
  - Open-Meteo Current Weather / Rainfall: 2 hours (7,200s)
  - River Gauges / Telemetry: 2 hours (7,200s)
  - GDACS Disaster Alerts: 6 hours (21,600s)
  - CWC Weekly Reservoir Bulletin: 10 days (864,000s)
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional

FRESHNESS_THRESHOLDS_SECONDS = {
    "open_meteo": 2 * 3600,             # 2 hours
    "cwc_bulletin": 10 * 24 * 3600,     # 10 days
    "river_gauge": 2 * 3600,            # 2 hours
    "gdacs_alerts": 6 * 3600,           # 6 hours
    "default": 4 * 3600,                # 4 hours
}


def _normalize_dt(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    # Strip tzinfo if present to compare against utcnow
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def evaluate_freshness(
    source_type: str,
    observation_time: Optional[datetime],
    value: Optional[float] = None,
    min_bound: Optional[float] = None,
    max_bound: Optional[float] = None,
    current_status: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluate data quality and freshness without substituting synthetic zeros.
    """
    # 1. Check upstream availability status
    if current_status in ("SOURCE_UNAVAILABLE", "UNAVAILABLE", "ERROR"):
        return {
            "quality_status": "SOURCE_UNAVAILABLE",
            "is_stale": True,
            "age_seconds": None,
            "warning": "External official data provider is currently unavailable.",
        }

    # 2. Check missing value
    if value is None and observation_time is None:
        return {
            "quality_status": "MISSING",
            "is_stale": True,
            "age_seconds": None,
            "warning": "No observation data available.",
        }

    # 3. Check physical validity
    if value is not None:
        if min_bound is not None and value < min_bound:
            return {
                "quality_status": "INVALID",
                "is_stale": False,
                "age_seconds": None,
                "warning": f"Value {value} is below physical minimum {min_bound}.",
            }
        if max_bound is not None and value > max_bound:
            return {
                "quality_status": "INVALID",
                "is_stale": False,
                "age_seconds": None,
                "warning": f"Value {value} exceeds physical maximum {max_bound}.",
            }

    # 4. Check freshness window
    norm_obs = _normalize_dt(observation_time)
    if norm_obs is None:
        return {
            "quality_status": "MISSING",
            "is_stale": True,
            "age_seconds": None,
            "warning": "Observation timestamp missing.",
        }

    now = datetime.utcnow()
    age_seconds = max(0.0, (now - norm_obs).total_seconds())
    threshold = FRESHNESS_THRESHOLDS_SECONDS.get(source_type, FRESHNESS_THRESHOLDS_SECONDS["default"])

    if age_seconds > threshold:
        age_hours = round(age_seconds / 3600.0, 1)
        threshold_hours = round(threshold / 3600.0, 1)
        return {
            "quality_status": "STALE",
            "is_stale": True,
            "age_seconds": round(age_seconds, 1),
            "threshold_seconds": threshold,
            "warning": f"Data is {age_hours}h old (freshness threshold: {threshold_hours}h).",
        }

    return {
        "quality_status": "FRESH",
        "is_stale": False,
        "age_seconds": round(age_seconds, 1),
        "threshold_seconds": threshold,
        "warning": None,
    }


def determine_reservoir_quality(
    data_source: Optional[str],
    last_updated_at: Optional[datetime],
    current_level: Optional[float],
    capacity: Optional[float],
) -> Dict[str, Any]:
    """Evaluate reservoir storage quality metadata."""
    is_cwc = bool(data_source and "cwc" in data_source.lower())
    source_type = "cwc_bulletin" if is_cwc else "default"
    
    # Boundary check: level cannot be negative, nor exceed 150% of nominal capacity
    max_level = (capacity * 1.5) if capacity else None
    return evaluate_freshness(
        source_type=source_type,
        observation_time=last_updated_at,
        value=current_level,
        min_bound=0.0,
        max_bound=max_level,
    )


def determine_river_quality(
    data_source: Optional[str],
    last_updated_at: Optional[datetime],
    river_level: Optional[float],
    danger_level: Optional[float],
) -> Dict[str, Any]:
    """Evaluate river gauge quality metadata."""
    max_level = (danger_level * 2.5) if danger_level else None
    return evaluate_freshness(
        source_type="river_gauge",
        observation_time=last_updated_at,
        value=river_level,
        min_bound=0.0,
        max_bound=max_level,
    )


def determine_alert_quality(
    issued_at: Optional[datetime],
) -> Dict[str, Any]:
    """Evaluate disaster alert quality metadata."""
    return evaluate_freshness(
        source_type="gdacs_alerts",
        observation_time=issued_at,
    )
