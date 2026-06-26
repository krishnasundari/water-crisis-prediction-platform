from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.models import Village, Reservoir, Alert, Prediction

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):

    # Total Villages
    total_villages = db.query(Village).count()

    # Total Reservoirs
    total_reservoirs = db.query(Reservoir).count()

    # Active Alerts
    active_alerts = db.query(Alert).filter(
        Alert.is_read == False
    ).count()

    # Risk Counts
    safe_villages = db.query(Prediction).filter(
        Prediction.risk_level == "Safe"
    ).count()

    moderate_risk_villages = db.query(Prediction).filter(
        Prediction.risk_level == "Moderate"
    ).count()

    high_risk_villages = db.query(Prediction).filter(
        Prediction.risk_level == "High"
    ).count()

    # Average Risk Score
    average_risk_score = db.query(
        func.avg(Prediction.risk_score)
    ).scalar()

    return {
        "total_villages": total_villages,
        "total_reservoirs": total_reservoirs,
        "safe_villages": safe_villages,
        "moderate_risk_villages": moderate_risk_villages,
        "high_risk_villages": high_risk_villages,
        "active_alerts": active_alerts,
        "average_risk_score": round(
            average_risk_score or 0, 2
        )
    }