import asyncio
import requests
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Reservoir, Village, RainfallRecord, GroundwaterRecord, Prediction, Alert
from app.ml.models.predictor import predict_water_crisis
from app.core.websocket_manager import manager
from app.services.weather_service import calculate_distance

async def sync_all_data(db: Session):
    """
    Perform a complete database update query:
    1. Loop all dams/reservoirs -> Query Open-Meteo live rain -> Save RainfallRecord -> Inflow calculation -> Update current levels.
    2. Loop all villages -> Query Open-Meteo live stats -> Save GroundwaterRecord -> Re-run ML predictions -> Save predictions.
    3. Generate warning alerts if ML risk levels are high/critical.
    4. Broadcast event via WebSocket to refresh React clients automatically.
    """
    print("===== STARTING DATA SYNC ENGINE =====")
    
    # 1. Update Reservoirs
    reservoirs = db.query(Reservoir).all()
    for res in reservoirs:
        lat = res.latitude or 0.0
        lon = res.longitude or 0.0
        
        # Query Open-Meteo current precipitation
        w_url = "https://api.open-meteo.com/v1/forecast"
        w_params = {
            "latitude": lat,
            "longitude": lon,
            "current": "precipitation",
            "timezone": "auto"
        }
        
        rain = 0.0
        try:
            resp = requests.get(w_url, params=w_params, timeout=5)
            if resp.ok:
                current = resp.json().get("current", {})
                rain = current.get("precipitation", 0.0) or 0.0
        except Exception as e:
            print(f"Error querying weather for dam {res.name}: {str(e)}")
            
        # Log rainfall record
        rain_record = RainfallRecord(
            reservoir_id=res.id,
            district=res.district,
            measurement_date=datetime.now(),
            rainfall_amount=rain
        )
        db.add(rain_record)
        
        # Calculate Inflow: Runoff coeff 0.35
        inflow = rain * 0.35
        # Cap current level at capacity
        res.current_level = min(res.capacity, res.current_level + inflow)
        db.add(res)
        
        # Outflow calculation based on dam capacity levels
        pct = (res.current_level / res.capacity) * 100
        if pct >= 100:
            outflow = 8.5
        elif pct >= 90:
            outflow = 4.5
        elif pct >= 75:
            outflow = 2.5
        elif pct >= 50:
            outflow = 1.2
        else:
            outflow = 0.4
            
        # Log to ReservoirHistory snapshot table
        from app.models.models import ReservoirHistory
        res_history = ReservoirHistory(
            reservoir_id=res.id,
            water_level=res.current_level,
            inflow=inflow,
            outflow=outflow,
            recorded_at=datetime.now()
        )
        db.add(res_history)
        
    db.commit()
    print("Dams levels, outflow updates, and history logging synced.")
    
    # 2. Update Villages & ML predictions
    villages = db.query(Village).all()
    for v in villages:
        lat = v.latitude
        lon = v.longitude
        
        # Query Open-Meteo current rain, temp, and other parameters
        w_url = "https://api.open-meteo.com/v1/forecast"
        w_params = {
            "latitude": lat,
            "longitude": lon,
            "current": "precipitation,temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,cloud_cover,visibility,weather_code",
            "timezone": "auto"
        }
        
        rain = 0.0
        temp = 25.0
        humidity = 50.0
        pressure = 1013.25
        wind_speed = 10.0
        cloud_cover = 0.0
        visibility = 10.0
        weather_code = 0
        try:
            resp = requests.get(w_url, params=w_params, timeout=5)
            if resp.ok:
                current = resp.json().get("current", {})
                rain = current.get("precipitation", 0.0) or 0.0
                temp = current.get("temperature_2m", 25.0)
                humidity = current.get("relative_humidity_2m", 50.0)
                pressure = current.get("surface_pressure", 1013.25)
                wind_speed = current.get("wind_speed_10m", 10.0)
                cloud_cover = current.get("cloud_cover", 0.0)
                visibility = (current.get("visibility", 10000.0) or 10000.0) / 1000.0
                weather_code = current.get("weather_code", 0)
        except Exception as e:
            print(f"Error querying weather for village {v.name}: {str(e)}")
            
        # Log to WeatherHistory
        from app.models.models import WeatherHistory
        
        def get_code_text(code: int) -> str:
            mapping = {
                0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
                45: "Foggy", 48: "Depositing Rime Fog", 51: "Light Drizzle", 53: "Moderate Drizzle",
                55: "Dense Drizzle", 61: "Light Rain", 63: "Moderate Rain", 65: "Heavy Rain",
                71: "Light Snow", 73: "Moderate Snow", 75: "Heavy Snow", 80: "Light Showers",
                81: "Moderate Showers", 82: "Violent Showers", 95: "Thunderstorm", 96: "Thunderstorm with Hail"
            }
            return mapping.get(code, "Cloudy")
            
        w_history = WeatherHistory(
            location_name=v.name,
            latitude=lat,
            longitude=lon,
            temperature=temp,
            humidity=humidity,
            pressure=pressure,
            rainfall=rain,
            wind_speed=wind_speed,
            cloud_cover=cloud_cover,
            visibility=visibility,
            condition=get_code_text(weather_code)
        )
        db.add(w_history)
            
        # Groundwater level calculation: rain recharges, default consumption lowers it
        latest_gw = db.query(GroundwaterRecord).filter(GroundwaterRecord.village_id == v.id).order_by(GroundwaterRecord.measurement_date.desc()).first()
        current_depth = latest_gw.depth if latest_gw else 12.5
        
        # Recharge decreases depth (brings level closer to surface); usage increases depth
        recharge = rain * 0.05
        usage = 0.02
        new_depth = max(1.0, current_depth + usage - recharge)
        
        # Save GroundwaterRecord
        gw_status = "stable"
        if new_depth > current_depth:
            gw_status = "declining"
        elif new_depth < current_depth:
            gw_status = "improving"
            
        gw_record = GroundwaterRecord(
            village_id=v.id,
            measurement_date=datetime.now(),
            depth=new_depth,
            status=gw_status
        )
        db.add(gw_record)
        
        # Find nearest dam level as percentage
        nearest_res = None
        min_dist = float("inf")
        for res in reservoirs:
            dist = calculate_distance(lat, lon, res.latitude, res.longitude)
            if dist < min_dist:
                min_dist = dist
                nearest_res = res
                
        dam_pct = 50.0
        if nearest_res:
            dam_pct = (nearest_res.current_level / nearest_res.capacity) * 100
            
        # Run ML Predictor
        result = predict_water_crisis(
            rainfall=rain,
            population=v.population or 5000,
            reservoir_capacity=dam_pct,
            groundwater_level=new_depth
        )
        
        # Save Prediction Record
        new_pred = Prediction(
            village_id=v.id,
            rainfall=rain,
            population=v.population or 5000,
            reservoir_capacity=dam_pct,
            groundwater_level=new_depth,
            risk_score=result["risk_score"],
            risk_level=result["risk_level"],
            prediction_date=datetime.now()
        )
        db.add(new_pred)
        
        # Trigger Alert Check
        if result["risk_level"] in ["High", "Moderate"]:
            alert_msg = f"Critical Scarcity Risk: {v.name} is classified as {result['risk_level']} warning level due to low dam capacity ({round(dam_pct,1)}%) and falling aquifers ({round(new_depth, 2)}m)."
            # Check if this alert has already been raised today
            today_alert = db.query(Alert).filter(
                Alert.village_id == v.id,
                Alert.alert_type == "drought",
                Alert.created_at >= datetime.now().replace(hour=0, minute=0, second=0)
            ).first()
            
            if not today_alert:
                new_alert = Alert(
                    village_id=v.id,
                    alert_type="drought",
                    severity="high" if result["risk_level"] == "High" else "medium",
                    message=alert_msg,
                    is_read=False,
                    created_at=datetime.now()
                )
                db.add(new_alert)
                
    db.commit()
    print("Villages water monitoring, ML models inference, and alert levels synced.")
    
    # Broadcast event via WebSocket
    await manager.broadcast({
        "event": "sync_complete",
        "timestamp": datetime.now().isoformat(),
        "message": "Live satellite telemetry check complete. All models recalculated."
    })
    print("===== DATA SYNC PIPELINE RUN COMPLETED =====")
