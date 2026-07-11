import urllib.request
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Village, Prediction, Alert
from app.services.weather_service import calculate_distance

router = APIRouter()

@router.get("/route")
def get_evacuation_route(village_id: int, db: Session = Depends(get_db)):
    # 1. Fetch source village details
    src = db.query(Village).filter(Village.id == village_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Source village not found")

    # 2. Find closest "Safe" village refuge
    villages = db.query(Village).filter(Village.id != village_id).all()
    
    refuge = None
    min_dist = float("inf")
    
    for v in villages:
        # Check latest risk level
        latest_pred = (
            db.query(Prediction)
            .filter(Prediction.village_id == v.id)
            .order_by(Prediction.prediction_date.desc())
            .first()
        )
        
        # Check active alerts for this village
        has_active_alert = (
            db.query(Alert)
            .filter(Alert.village_id == v.id, Alert.is_read == False)
            .first()
        )
        
        is_safe = False
        if latest_pred and latest_pred.risk_level.lower() == "safe" and not has_active_alert:
            is_safe = True
            
        # If it is designated safe, consider it as a refuge
        if is_safe:
            dist = calculate_distance(src.latitude, src.longitude, v.latitude, v.longitude)
            if dist < min_dist:
                min_dist = dist
                refuge = v

    # Fallback to the closest village overall if no safe village exists
    if not refuge:
        for v in villages:
            dist = calculate_distance(src.latitude, src.longitude, v.latitude, v.longitude)
            if dist < min_dist:
                min_dist = dist
                refuge = v

    if not refuge:
        raise HTTPException(status_code=404, detail="No alternative refuge villages found")

    # 3. Call OSRM public API to get routing geometry
    lon_src, lat_src = src.longitude, src.latitude
    lon_ref, lat_ref = refuge.longitude, refuge.latitude
    
    osrm_url = f"https://router.project-osrm.org/route/v1/driving/{lon_src},{lat_src};{lon_ref},{lat_ref}?overview=full&geometries=geojson"
    
    route_coordinates = []
    distance_km = round(min_dist, 2)
    duration_minutes = round(min_dist * 1.5, 1) # Estimated fallback driving speed
    routing_mode = "fallback_direct"

    try:
        req = urllib.request.Request(
            osrm_url,
            headers={"User-Agent": "WaterCrisisPlatform/1.0 (evacuation routing router)"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            if res_data.get("code") == "Ok" and res_data.get("routes"):
                route = res_data["routes"][0]
                distance_km = round(route["distance"] / 1000.0, 2)
                duration_minutes = round(route["duration"] / 60.0, 1)
                
                # OSRM coordinates format: [lng, lat] -> convert to Leaflet format: [lat, lng]
                geojson_coords = route["geometry"]["coordinates"]
                route_coordinates = [[lat, lng] for lng, lat in geojson_coords]
                routing_mode = "osrm_streets"
    except Exception as e:
        print(f"OSRM Routing failed, falling back to direct line: {e}")
        # Direct line fallback
        route_coordinates = [
            [src.latitude, src.longitude],
            [refuge.latitude, refuge.longitude]
        ]

    return {
        "source": {
            "id": src.id,
            "name": src.name,
            "latitude": src.latitude,
            "longitude": src.longitude
        },
        "refuge": {
            "id": refuge.id,
            "name": refuge.name,
            "latitude": refuge.latitude,
            "longitude": refuge.longitude
        },
        "distance_km": distance_km,
        "duration_minutes": duration_minutes,
        "routing_mode": routing_mode,
        "route_coordinates": route_coordinates
    }
