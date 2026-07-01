from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Prediction
from app.schemas.schemas import PredictionRequest

# ML Predictor
from app.ml.models.predictor import predict_water_crisis

router = APIRouter()


@router.get("/")
def list_predictions(db: Session = Depends(get_db)):
    return db.query(Prediction).all()


@router.post("/")
def create_prediction(
    prediction: PredictionRequest,
    db: Session = Depends(get_db),
):
    """
    Create prediction using the trained ML model.
    """

    rainfall = prediction.rainfall or 0
    population = prediction.population or 0
    reservoir_capacity = prediction.reservoir_capacity or 0
    groundwater_level = prediction.groundwater_level or 0

    # -------------------------------
    # ML Prediction
    # -------------------------------
    result = predict_water_crisis(
        rainfall=rainfall,
        population=population,
        reservoir_capacity=reservoir_capacity,
        groundwater_level=groundwater_level,
    )

    new_prediction = Prediction(
        village_id=prediction.village_id,
        rainfall=rainfall,
        population=population,
        reservoir_capacity=reservoir_capacity,
        groundwater_level=groundwater_level,
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        prediction_date=datetime.now(),
    )

    db.add(new_prediction)
    db.commit()
    db.refresh(new_prediction)

    return {
        "message": "Prediction generated successfully using ML model.",
        "prediction": {
            "id": new_prediction.id,
            "village_id": new_prediction.village_id,
            "risk_score": new_prediction.risk_score,
            "risk_level": new_prediction.risk_level,
            "prediction_date": new_prediction.prediction_date,
        },
    }


@router.get("/stats")
def prediction_stats(db: Session = Depends(get_db)):
    predictions = db.query(Prediction).all()

    safe = 0
    moderate = 0
    high = 0
    total_score = 0

    for p in predictions:
        total_score += p.risk_score

        if p.risk_level == "Safe":
            safe += 1
        elif p.risk_level == "Moderate":
            moderate += 1
        else:
            high += 1

    average_score = (
        round(total_score / len(predictions), 2)
        if predictions
        else 0
    )

    return {
        "total_predictions": len(predictions),
        "safe_count": safe,
        "moderate_count": moderate,
        "high_count": high,
        "average_risk_score": average_score,
    }


@router.get("/{prediction_id}")
def get_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
):
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id)
        .first()
    )

    if prediction is None:
        raise HTTPException(
            status_code=404,
            detail="Prediction not found",
        )

    return prediction


@router.delete("/{prediction_id}")
def delete_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
):
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id)
        .first()
    )

    if prediction is None:
        raise HTTPException(
            status_code=404,
            detail="Prediction not found",
        )

    db.delete(prediction)
    db.commit()

    return {
        "message": "Prediction deleted successfully."
    }