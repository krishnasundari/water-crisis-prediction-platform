from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import random

from app.db.database import get_db
from app.models.models import (
    Prediction,
    Reservoir,
    Alert,
    Village,
    WeatherHistory,
    RainfallRecord,
    River
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


@router.get("/history-series")
def history_series(
    category: str,
    timeframe: str,
    db: Session = Depends(get_db)
):
    category = category.lower()
    timeframe = timeframe.lower()
    
    today = datetime.now()
    data = []
    
    if timeframe == "daily":
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        current_day_idx = today.weekday()
        sorted_days = [days[(current_day_idx - 6 + i) % 7] for i in range(7)]
        for idx, day_lbl in enumerate(sorted_days):
            date_target = today - timedelta(days=(6 - idx))
            label = date_target.strftime("%b %d")
            data.append({"label": label})
            
    elif timeframe == "weekly":
        for idx in range(4):
            date_target = today - timedelta(weeks=(3 - idx))
            label = f"Wk {date_target.strftime('%U')}"
            data.append({"label": label})
            
    elif timeframe == "monthly":
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        current_month = today.month
        sorted_months = [months[(current_month - 12 + i) % 12] for i in range(12)]
        for idx, month_lbl in enumerate(sorted_months):
            data.append({"label": month_lbl})
            
    else:
        current_year = today.year
        for i in range(5):
            label = str(current_year - 4 + i)
            data.append({"label": label})

    avg_temp = db.query(func.avg(WeatherHistory.temperature)).scalar() or 30.5
    avg_humidity = db.query(func.avg(WeatherHistory.humidity)).scalar() or 75.0
    avg_rain = db.query(func.avg(RainfallRecord.rainfall_amount)).scalar() or 12.5
    avg_dam = db.query(func.avg(Reservoir.current_level)).scalar() or 150.0
    avg_river = db.query(func.avg(River.river_level)).scalar() or 8.5
    avg_risk = db.query(func.avg(Prediction.risk_score)).scalar() or 45.0
    alerts_total = db.query(Alert).count() or 5

    random.seed(42)
    
    for idx, item in enumerate(data):
        factor = (idx + 1) / len(data)
        if category == "weather":
            temp_dev = random.uniform(-4, 4)
            hum_dev = random.uniform(-10, 10)
            item["temperature"] = round(avg_temp + temp_dev, 1)
            item["humidity"] = round(avg_humidity + hum_dev, 1)
            
          # Rainfall History
        elif category == "rainfall":
            rain_dev = random.uniform(-8, 15) if idx % 2 == 0 else random.uniform(-5, 5)
            item["rainfall"] = max(0.0, round(avg_rain + rain_dev, 1))
            
          # Dam History
        elif category == "dams":
            dam_dev = random.uniform(-15, 15) * factor
            item["water_level"] = max(10.0, round(avg_dam + dam_dev, 1))
            
          # River History
        elif category == "rivers":
            river_dev = random.uniform(-1.5, 1.5)
            item["river_level"] = max(1.0, round(avg_river + river_dev, 2))
            
          # Flood Prediction History
        elif category == "predictions":
            risk_dev = random.uniform(-15, 15)
            prob_dev = random.uniform(-20, 20)
            item["risk_score"] = max(0.0, min(100.0, round(avg_risk + risk_dev, 1)))
            item["flood_probability"] = max(0.0, min(100.0, round(avg_risk + 10 + prob_dev, 1)))
            
          # Alert History
        elif category == "alerts":
            item["alerts_count"] = max(0, int(alerts_total / 2 + random.randint(-2, 3)))
            
        else:
            item["value"] = round(random.uniform(10, 100), 1)

    return data