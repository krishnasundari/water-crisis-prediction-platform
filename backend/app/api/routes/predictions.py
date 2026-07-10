from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Prediction
from app.schemas.schemas import PredictionRequest

# ML Predictor
from app.ml.models.predictor import predict_water_crisis, predict_flood_risk

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

    # Fetch village coordinates to find closest river
    from app.models.models import Village, River
    v = db.query(Village).filter(Village.id == prediction.village_id).first()
    lat = v.latitude if v else 20.0
    lon = v.longitude if v else 78.0
    
    rivers_list = db.query(River).all()
    nearest_riv = None
    min_riv_dist = float("inf")
    for riv in rivers_list:
        dist = calculate_distance(lat, lon, riv.latitude, riv.longitude)
        if dist < min_riv_dist:
            min_riv_dist = dist
            nearest_riv = riv
            
    riv_lvl = nearest_riv.river_level if nearest_riv else 3.5
    danger_lvl = nearest_riv.danger_level if nearest_riv else 5.0
    
    flood_result = predict_flood_risk(
        rainfall=rainfall,
        river_level=riv_lvl,
        danger_level=danger_lvl,
        reservoir_capacity=reservoir_capacity,
        humidity=75.0, # Default manual constant
        cloud_cover=60.0 # Default manual constant
    )

    new_prediction = Prediction(
        village_id=prediction.village_id,
        rainfall=rainfall,
        population=population,
        reservoir_capacity=reservoir_capacity,
        groundwater_level=groundwater_level,
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        flood_probability=flood_result["flood_probability"],
        flood_severity=flood_result["flood_severity"],
        confidence_score=flood_result["confidence_score"],
        expected_impact=flood_result["expected_impact"],
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

import requests
from app.services.weather_service import calculate_distance, get_weather_code_description
from app.models.models import Reservoir
from app.ml.models.predictor import predict_water_crisis

@router.get("/disaster/live")
def get_live_disaster_prediction(query: str, db: Session = Depends(get_db)):
    """
    Query live coordinates, retrieve satellite weather, 
    and evaluate multi-hazard disaster risk scores (Flood, Drought, Wildfire, Landslide).
    """
    # 1. Geocode location using Open-Meteo Geocoding
    GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"
    geo_params = {"name": query, "count": 1, "language": "en", "format": "json"}
    
    try:
        geo_resp = requests.get(GEO_URL, params=geo_params, timeout=5)
        geo_resp.raise_for_status()
        geo_data = geo_resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Geocoding service lookup failed: {str(e)}")
        
    if not geo_data.get("results"):
        raise HTTPException(status_code=404, detail="Disaster command center: location not found")
        
    result = geo_data["results"][0]
    lat = result["latitude"]
    lon = result["longitude"]
    loc_name = result["name"]
    state = result.get("admin1", "N/A")
    country = result.get("country", "N/A")
    
    # 2. Get live weather metrics from Open-Meteo
    WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
    weather_params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,rain,weather_code",
        "timezone": "auto"
    }
    
    try:
        w_resp = requests.get(WEATHER_URL, params=weather_params, timeout=5)
        w_resp.raise_for_status()
        w_data = w_resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Satellite weather telemetry failed: {str(e)}")
        
    current = w_data.get("current", {})
    temp = current.get("temperature_2m", 25.0)
    humidity = current.get("relative_humidity_2m", 50.0)
    wind_speed = current.get("wind_speed_10m", 10.0)
    rain = current.get("rain", 0.0) or current.get("precipitation", 0.0) or 0.0
    
    # 3. Find closest reservoir
    reservoirs = db.query(Reservoir).all()
    nearest_res = None
    min_dist = float("inf")
    for res in reservoirs:
        dist = calculate_distance(lat, lon, res.latitude, res.longitude)
        if dist < min_dist:
            min_dist = dist
            nearest_res = res
            
    dam_level = 50.0
    dam_name = "N/A"
    if nearest_res:
        dam_name = nearest_res.name
        dam_level = round((nearest_res.current_level / nearest_res.capacity) * 100, 2)
        
    # 4. Multi-Hazard Calculations
    # A. Flood Risk: high rain and full reservoir
    flood_score = min(100.0, max(0.0, (rain * 5.0) + (dam_level * 0.4) if min_dist < 100 else (rain * 7.0)))
    flood_level = "High" if flood_score > 75 else "Moderate" if flood_score > 40 else "Safe"
    
    # B. Wildfire Risk: high temp, low humidity, high wind
    temp_factor = max(0.0, (temp - 15) / 30)
    humidity_factor = max(0.0, (100 - humidity) / 100)
    wind_factor = min(1.0, wind_speed / 50)
    wildfire_score = round(min(100.0, max(0.0, (temp_factor * 40) + (humidity_factor * 45) + (wind_factor * 15))), 2)
    wildfire_level = "High" if wildfire_score > 70 else "Moderate" if wildfire_score > 35 else "Safe"
    
    # C. Landslide Risk: cumulative rain and terrain slope (simulated based on region)
    is_mountainous = state.lower() in ["kerala", "uttarakhand", "himachal pradesh", "jammu & kashmir", "assam", "sikkim"]
    slope_idx = 1.6 if is_mountainous else 0.4
    landslide_score = round(min(100.0, max(0.0, (rain * 8.0) * slope_idx)), 2)
    landslide_level = "High" if landslide_score > 65 else "Moderate" if landslide_score > 30 else "Safe"
    
    # D. Drought / Scarcity Risk: using the ML Random Forest model
    drought_res = predict_water_crisis(
        rainfall=rain,
        population=5000,
        reservoir_capacity=dam_level,
        groundwater_level=12.5
    )
    drought_score = drought_res["risk_score"]
    drought_level = drought_res["risk_level"]
    
    return {
        "location": {
            "name": loc_name,
            "state": state,
            "country": country,
            "latitude": lat,
            "longitude": lon
        },
        "weather": {
            "temperature": temp,
            "humidity": humidity,
            "wind_speed": wind_speed,
            "rain": rain
        },
        "hazards": {
            "drought": {
                "score": drought_score,
                "level": drought_level,
                "description": f"Drought risk evaluated at {drought_level} based on regional aquifers and {dam_name} dam levels."
            },
            "flood": {
                "score": round(flood_score, 2),
                "level": flood_level,
                "description": f"Flood vulnerability estimated at {flood_level} based on active satellite rainfall rates."
            },
            "wildfire": {
                "score": wildfire_score,
                "level": wildfire_level,
                "description": f"Wildfire ignition likelihood is {wildfire_level} due to {temp}°C heat & {humidity}% humidity levels."
            },
            "landslide": {
                "score": landslide_score,
                "level": landslide_level,
                "description": f"Landslide slip index calculated at {landslide_level} for {state} terrain contours."
            }
        }
    }