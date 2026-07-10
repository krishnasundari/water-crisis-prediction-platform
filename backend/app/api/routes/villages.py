from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Village
from app.schemas.schemas import VillageCreate

router = APIRouter()


@router.get("/")
def list_villages(db: Session = Depends(get_db)):
    return db.query(Village).all()


@router.get("/{village_id}")
def get_village(village_id: int, db: Session = Depends(get_db)):
    village = db.query(Village).filter(
        Village.id == village_id
    ).first()

    if not village:
        raise HTTPException(
            status_code=404,
            detail="Village not found"
        )

    return village


@router.post("/")
def create_village(
    village: VillageCreate,
    db: Session = Depends(get_db)
):
    new_village = Village(
        name=village.name,
        district=village.district,
        state=village.state,
        population=village.population,
        latitude=village.latitude,
        longitude=village.longitude,
        water_source=village.water_source,
        reservoir_dependency=village.reservoir_dependency,
    )

    db.add(new_village)
    db.commit()
    db.refresh(new_village)

    return new_village


@router.delete("/{village_id}")
def delete_village(
    village_id: int,
    db: Session = Depends(get_db)
):
    village = db.query(Village).filter(
        Village.id == village_id
    ).first()

    if not village:
        raise HTTPException(
            status_code=404,
            detail="Village not found"
        )

    db.delete(village)
    db.commit()

    return {"message": "Village deleted successfully"}

import requests
from app.services.weather_service import calculate_distance, get_weather_code_description
from app.ml.models.predictor import predict_water_crisis
from app.models.models import Reservoir, GroundwaterRecord, Prediction
from datetime import datetime

@router.get("/{village_id}/live-status")
def get_village_live_status(village_id: int, db: Session = Depends(get_db)):
    """
    Fetch live weather, calculate nearest dam, and run ML model 
    to output the live safety risk status for the village.
    """
    # 1. Fetch village
    village = db.query(Village).filter(Village.id == village_id).first()
    if not village:
        raise HTTPException(
            status_code=404,
            detail="Village not found"
        )
        
    # 2. Get live rainfall & weather from Open-Meteo
    WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast"
    weather_params = {
        "latitude": village.latitude,
        "longitude": village.longitude,
        "current": "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code",
        "timezone": "auto"
    }
    
    try:
        weather_response = requests.get(WEATHER_API_URL, params=weather_params, timeout=5)
        weather_response.raise_for_status()
        weather_data = weather_response.json()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Live weather service failed: {str(e)}"
        )
        
    current = weather_data.get("current", {})
    temp = current.get("temperature_2m", 25.0)
    live_rain = current.get("rain", 0.0) or current.get("precipitation", 0.0) or 0.0
    weather_code = current.get("weather_code", 0)
    condition = get_weather_code_description(weather_code)
    
    # 3. Find nearest reservoir and simulate live level
    reservoirs = db.query(Reservoir).all()
    nearest_res = None
    min_dist = float("inf")
    
    for res in reservoirs:
        dist = calculate_distance(village.latitude, village.longitude, res.latitude, res.longitude)
        if dist < min_dist:
            min_dist = dist
            nearest_res = res
            
    simulated_dam_level = 50.0
    dam_name = "N/A"
    
    if nearest_res:
        dam_name = nearest_res.name
        simulated_dam_level = nearest_res.current_level
        # Hydrological Simulation: If it's currently raining, increase water levels
        if live_rain > 0 and min_dist < 250:
            rain_fill_factor = live_rain * 0.15
            simulated_dam_level = min(100.0, round(nearest_res.current_level + rain_fill_factor, 2))
            
    # 4. Fetch most recent groundwater depth for the village
    gw_record = db.query(GroundwaterRecord).filter(
        GroundwaterRecord.village_id == village_id
    ).order_by(GroundwaterRecord.measurement_date.desc()).first()
    
    gw_depth = gw_record.depth if gw_record else 12.5
    
    # 5. Execute ML Predictor Model
    result = predict_water_crisis(
        rainfall=live_rain,
        population=village.population or 1000,
        reservoir_capacity=simulated_dam_level,
        groundwater_level=gw_depth
    )
    
    # 6. Log prediction record to DB
    new_prediction = Prediction(
        village_id=village_id,
        rainfall=live_rain,
        population=village.population or 1000,
        reservoir_capacity=simulated_dam_level,
        groundwater_level=gw_depth,
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        prediction_date=datetime.now()
    )
    
    db.add(new_prediction)
    db.commit()
    
    return {
        "id": village_id,
        "name": village.name,
        "temp": temp,
        "rain": live_rain,
        "condition": condition,
        "risk_level": result["risk_level"],
        "risk_score": result["risk_score"],
        "nearest_dam": dam_name,
        "dam_level": simulated_dam_level,
        "distance_km": round(min_dist, 2) if min_dist != float("inf") else 0
    }