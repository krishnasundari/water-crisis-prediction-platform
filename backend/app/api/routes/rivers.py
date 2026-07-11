from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.database import get_db
from app.models.models import River, RiverHistory

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
        "last_updated_at": getattr(river, "last_updated_at", None) or river.updated_at or river.created_at or datetime.now(),
        "last_updated": river.updated_at or river.created_at or datetime.now()
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
