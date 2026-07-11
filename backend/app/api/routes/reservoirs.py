from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Reservoir
from app.schemas.schemas import ReservoirCreate

router = APIRouter()


@router.get("/")
def list_reservoirs(db: Session = Depends(get_db)):
    return db.query(Reservoir).all()


@router.get("/{reservoir_id}")
def get_reservoir(
    reservoir_id: int,
    db: Session = Depends(get_db)
):
    reservoir = db.query(Reservoir).filter(
        Reservoir.id == reservoir_id
    ).first()

    if not reservoir:
        raise HTTPException(
            status_code=404,
            detail="Reservoir not found"
        )

    return reservoir


@router.post("/")
def create_reservoir(
    reservoir: ReservoirCreate,
    db: Session = Depends(get_db)
):
    new_reservoir = Reservoir(
        name=reservoir.name,
        capacity=reservoir.capacity,
        current_level=reservoir.current_level,
        district=reservoir.district,
        state=reservoir.state,
        latitude=reservoir.latitude,
        longitude=reservoir.longitude,
    )

    db.add(new_reservoir)
    db.commit()
    db.refresh(new_reservoir)

    return new_reservoir


@router.delete("/{reservoir_id}")
def delete_reservoir(
    reservoir_id: int,
    db: Session = Depends(get_db)
):
    reservoir = db.query(Reservoir).filter(
        Reservoir.id == reservoir_id
    ).first()

    if not reservoir:
        raise HTTPException(
            status_code=404,
            detail="Reservoir not found"
        )

    db.delete(reservoir)
    db.commit()

    return {
        "message": "Reservoir deleted successfully"
    }

from datetime import datetime
from app.models.models import ReservoirHistory, RainfallRecord

@router.get("/{reservoir_id}/live-status")
def get_reservoir_live_status(reservoir_id: int, db: Session = Depends(get_db)):
    """
    Get comprehensive live telemetry metrics for a dam/reservoir.
    """
    res = db.query(Reservoir).filter(Reservoir.id == reservoir_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservoir not found")
        
    # Get latest logged rainfall rate
    latest_rain = db.query(RainfallRecord).filter(
        RainfallRecord.reservoir_id == res.id
    ).order_by(RainfallRecord.measurement_date.desc()).first()
    
    rain = latest_rain.rainfall_amount if latest_rain else 0.0
    
    # Calculate simulated Inflow: 0.35 runoff coefficient
    inflow = round(rain * 0.35, 2)
    
    # Calculate simulated Outflow based on levels
    pct = (res.current_level / res.capacity) * 100
    if pct >= 100:
        outflow = 8.5 # Emergency floodgate dump
    elif pct >= 90:
        outflow = 4.5 # Heavy overflow release
    elif pct >= 75:
        outflow = 2.5 # Controlled warning release
    elif pct >= 50:
        outflow = 1.2 # Standard flow release
    else:
        outflow = 0.4 # Minimum ecological release
        
    # Determine Overflow Alert Status
    if res.current_level >= res.capacity:
        status = "Breached"
    elif pct >= 90:
        status = "Critical"
    elif pct >= 75:
        status = "Warning"
    else:
        status = "Normal"
        
    return {
        "id": res.id,
        "name": res.name,
        "capacity": res.capacity,
        "current_level": round(res.current_level, 2),
        "storage_percentage": round(pct, 2),
        "inflow": inflow,
        "outflow": outflow,
        "overflow_status": status,
        "district": res.district,
        "state": res.state,
        "latitude": res.latitude,
        "longitude": res.longitude,
        "data_source": getattr(res, "data_source", "Estimated (Runoff Calculation)"),
        "data_status": getattr(res, "data_status", "Estimated"),
        "last_updated_at": getattr(res, "last_updated_at", None) or res.updated_at or res.created_at or datetime.now(),
        "last_updated": res.updated_at or res.created_at or datetime.now()
    }

@router.get("/{reservoir_id}/history")
def get_reservoir_history(reservoir_id: int, db: Session = Depends(get_db)):
    """
    Retrieve last 15 historical snapshots for water level charts.
    """
    records = db.query(ReservoirHistory).filter(
        ReservoirHistory.reservoir_id == reservoir_id
    ).order_by(ReservoirHistory.recorded_at.desc()).limit(15).all()
    
    records.reverse()
    
    return [
        {
            "id": r.id,
            "reservoir_id": r.reservoir_id,
            "water_level": round(r.water_level, 2),
            "inflow": round(r.inflow or 0.0, 2),
            "outflow": round(r.outflow or 0.0, 2),
            "recorded_at": r.recorded_at
        }
        for r in records
    ]