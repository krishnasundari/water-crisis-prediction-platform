from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.models import (
    Prediction,
    Reservoir,
    Alert,
    Village
)

router = APIRouter()


@router.get("/risk-distribution")
def risk_distribution(
    db: Session = Depends(get_db)
):
    safe = db.query(Prediction).filter(
        Prediction.risk_level == "Safe"
    ).count()

    moderate = db.query(Prediction).filter(
        Prediction.risk_level == "Moderate"
    ).count()

    high = db.query(Prediction).filter(
        Prediction.risk_level == "High"
    ).count()

    return {
        "safe": safe,
        "moderate": moderate,
        "high": high
    }


@router.get("/reservoir-utilization")
def reservoir_utilization(
    db: Session = Depends(get_db)
):
    reservoirs = db.query(Reservoir).all()

    result = []

    for reservoir in reservoirs:

        utilization = 0

        if reservoir.capacity > 0:
            utilization = round(
                (reservoir.current_level / reservoir.capacity) * 100,
                2
            )

        result.append({
            "id": reservoir.id,
            "name": reservoir.name,
            "district": reservoir.district,
            "capacity": reservoir.capacity,
            "current_level": reservoir.current_level,
            "utilization": utilization
        })

    return result


@router.get("/district-summary")
def district_summary(
    db: Session = Depends(get_db)
):
    villages = db.query(Village).all()

    summary = {}

    for village in villages:

        if village.district not in summary:
            summary[village.district] = {
                "district": village.district,
                "villages": 0,
                "population": 0
            }

        summary[village.district]["villages"] += 1

        summary[village.district]["population"] += (
            village.population or 0
        )

    return list(summary.values())


@router.get("/alerts-summary")
def alerts_summary(
    db: Session = Depends(get_db)
):
    low = db.query(Alert).filter(
        Alert.severity == "low"
    ).count()

    medium = db.query(Alert).filter(
        Alert.severity == "medium"
    ).count()

    high = db.query(Alert).filter(
        Alert.severity == "high"
    ).count()

    critical = db.query(Alert).filter(
        Alert.severity == "critical"
    ).count()

    unread = db.query(Alert).filter(
        Alert.is_read == False
    ).count()

    total = db.query(Alert).count()

    return {
        "total": total,
        "unread": unread,
        "low": low,
        "medium": medium,
        "high": high,
        "critical": critical
    }


@router.get("/monthly-predictions")
def monthly_predictions(
    db: Session = Depends(get_db)
):
    predictions = (
        db.query(Prediction)
        .order_by(Prediction.prediction_date.desc())
        .all()
    )

    result = []

    for prediction in predictions:

        result.append({
            "id": prediction.id,
            "village_id": prediction.village_id,
            "risk_score": prediction.risk_score,
            "risk_level": prediction.risk_level,
            "prediction_date": prediction.prediction_date
        })

    return result