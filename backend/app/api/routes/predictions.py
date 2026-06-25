from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.database import get_db
from app.models.models import Prediction
from app.schemas.schemas import PredictionRequest

router = APIRouter()


@router.get("/")
def list_predictions(db: Session = Depends(get_db)):
    return db.query(Prediction).all()


@router.post("/")
def create_prediction(
    prediction: PredictionRequest,
    db: Session = Depends(get_db)
):
    risk_score = 0

    if prediction.rainfall is not None and prediction.rainfall < 50:
        risk_score += 30

    if prediction.population is not None and prediction.population > 10000:
        risk_score += 20

    if (
        prediction.reservoir_capacity is not None
        and prediction.reservoir_capacity < 40
    ):
        risk_score += 30

    if (
        prediction.groundwater_level is not None
        and prediction.groundwater_level < 20
    ):
        risk_score += 20

    if risk_score >= 70:
        risk_level = "High"
    elif risk_score >= 40:
        risk_level = "Moderate"
    else:
        risk_level = "Safe"

    new_prediction = Prediction(
        village_id=prediction.village_id,
        rainfall=prediction.rainfall,
        population=prediction.population,
        reservoir_capacity=prediction.reservoir_capacity,
        groundwater_level=prediction.groundwater_level,
        risk_score=risk_score,
        risk_level=risk_level,
        prediction_date=datetime.now(),
    )

    db.add(new_prediction)
    db.commit()
    db.refresh(new_prediction)

    return new_prediction


@router.get("/stats")
def prediction_stats(db: Session = Depends(get_db)):
    predictions = db.query(Prediction).all()

    safe = 0
    moderate = 0
    high = 0

    for p in predictions:
        if p.risk_level == "Safe":
            safe += 1
        elif p.risk_level == "Moderate":
            moderate += 1
        else:
            high += 1

    return {
        "total": len(predictions),
        "safe": safe,
        "moderate": moderate,
        "high": high,
    }


@router.delete("/{prediction_id}")
def delete_prediction(
    prediction_id: int,
    db: Session = Depends(get_db)
):
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id)
        .first()
    )

    if not prediction:
        raise HTTPException(
            status_code=404,
            detail="Prediction not found",
        )

    db.delete(prediction)
    db.commit()

    return {
        "message": "Prediction deleted successfully"
    }