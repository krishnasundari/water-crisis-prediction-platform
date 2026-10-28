from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.services.flood_intelligence_service import (
    flood_intelligence_service,
    OFFICIAL_EMERGENCY_DISCLAIMER,
    FLOOD_INTELLIGENCE_LIMITATIONS,
)

router = APIRouter()


@router.get("/official-warnings")
def list_official_warnings(
    active_only: bool = Query(True, description="Filter for active, unexpired warnings only"),
    authority: Optional[str] = Query(None, description="Filter by issuing authority (e.g., GDACS, CWC, IMD)"),
    db: Session = Depends(get_db),
):
    """
    Retrieve verified official disaster warnings ingested from authoritative agencies.
    Preserves issuing authority, timestamps, validity periods, affected locations,
    and external source identifiers.
    """
    warnings = flood_intelligence_service.get_official_warnings(
        db=db,
        active_only=active_only,
        authority=authority,
    )
    return {
        "count": len(warnings),
        "active_only": active_only,
        "warnings": warnings,
        "disclaimer": OFFICIAL_EMERGENCY_DISCLAIMER,
        "limitations": FLOOD_INTELLIGENCE_LIMITATIONS,
    }


@router.get("/river-status")
def get_river_flood_status(db: Session = Depends(get_db)):
    """
    Evaluate monitored river stations against official danger thresholds.
    Distinguishes normal fluvial range from approaching and breached danger levels.
    """
    return flood_intelligence_service.get_river_flood_status(db=db)


@router.get("/risk-assessment")
def get_flood_risk_assessment(
    river_id: Optional[int] = Query(None, description="Monitored river station ID"),
    reservoir_id: Optional[int] = Query(None, description="Upstream reservoir ID"),
    forecast_rain_24h_mm: float = Query(0.0, ge=0.0, le=1000.0, description="Forecast 24h precipitation (mm)"),
    db: Session = Depends(get_db),
):
    """
    Calculate transparent multi-factor flood risk indicator combining river stage,
    upstream dam saturation, and rainfall forecast.
    Explicitly marked as an informational platform estimate, NOT an official emergency directive.
    """
    return flood_intelligence_service.evaluate_flood_risk_indicator(
        db=db,
        river_id=river_id,
        reservoir_id=reservoir_id,
        forecast_rain_24h_mm=forecast_rain_24h_mm,
    )


@router.post("/sync-warnings")
def sync_official_warnings(db: Session = Depends(get_db)):
    """
    Trigger synchronization of official disaster warnings from verified authorities.
    Prevents duplicate warnings and updates expiry status.
    """
    result = flood_intelligence_service.sync_official_warnings(db=db)
    return result
