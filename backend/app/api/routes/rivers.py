from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.database import get_db
from app.models.models import River, RiverHistory
from app.core.freshness import determine_river_quality

router = APIRouter()

@router.get("/")
def list_rivers(db: Session = Depends(get_db)):
    """
    List all rivers with basic telemetry.
    """
    return db.query(River).all()

@router.get("/{river_id}/live-status")
def get_river_live_status(river_id: int, db: Session = Depends(get_db)):
    """
    Get detailed current metrics and percentage danger limits for a river.
    """
    river = db.query(River).filter(River.id == river_id).first()
    if not river:
        raise HTTPException(status_code=404, detail="River not found")
        
    pct_danger = (river.river_level / river.danger_level) * 100
    
    last_obs_time = getattr(river, "last_updated_at", None) or river.updated_at or river.created_at
    quality = determine_river_quality(
        data_source=getattr(river, "data_source", None),
        last_updated_at=last_obs_time,
        river_level=river.river_level,
        danger_level=river.danger_level,
    )

    return {
        "id": river.id,
        "name": river.name,
        "river_level": round(river.river_level, 2),
        "danger_level": round(river.danger_level, 2),
        "percentage_of_danger": round(pct_danger, 2),
        "flow_rate": round(river.flow_rate, 2),
        "trend": river.trend,
        "latitude": river.latitude,
        "longitude": river.longitude,
        "data_source": getattr(river, "data_source", "Simulated Telemetry"),
        "data_status": getattr(river, "data_status", "Simulated"),
        "quality_status": quality["quality_status"],
        "is_stale": quality["is_stale"],
        "freshness_warning": quality["warning"],
        "last_updated_at": last_obs_time or datetime.utcnow(),
        "last_updated": river.updated_at or river.created_at or datetime.utcnow()
    }

@router.get("/{river_id}/history")
def get_river_history(river_id: int, db: Session = Depends(get_db)):
    """
    Retrieve last 15 historical snapshots for river level trend plotting.
    """
    records = db.query(RiverHistory).filter(
        RiverHistory.river_id == river_id
    ).order_by(RiverHistory.recorded_at.desc()).limit(15).all()
    
    records.reverse()
    
    return [
        {
            "id": r.id,
            "river_id": r.river_id,
            "river_level": round(r.river_level, 2),
            "flow_rate": round(r.flow_rate, 2),
            "trend": r.trend,
            "recorded_at": r.recorded_at
        }
        for r in records
    ]
