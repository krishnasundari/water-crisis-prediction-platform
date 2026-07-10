from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.weather_service import search_weather_and_reservoirs

router = APIRouter()

@router.get("/search")
def search_weather(query: str, db: Session = Depends(get_db)):
    """
    Search live weather and 15-day forecasts for a location,
    and returns nearest database reservoirs with dynamic water levels.
    """
    if not query or not query.strip():
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty"
        )
        
    result = search_weather_and_reservoirs(db, query.strip())
    
    if "error" in result:
        raise HTTPException(
            status_code=404,
            detail=result["error"]
        )
        
    return result

import requests
from app.models.models import WeatherHistory

def get_weather_code_text(code: int) -> str:
    mapping = {
        0: "Clear Sky",
        1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
        45: "Foggy", 48: "Depositing Rime Fog",
        51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
        61: "Light Rain", 63: "Moderate Rain", 65: "Heavy Rain",
        71: "Light Snow", 73: "Moderate Snow", 75: "Heavy Snow",
        80: "Light Showers", 81: "Moderate Showers", 82: "Violent Showers",
        95: "Thunderstorm", 96: "Thunderstorm with Hail"
    }
    return mapping.get(code, "Cloudy")

@router.get("/live")
def get_live_weather(query: str, db: Session = Depends(get_db)):
    """
    Fetch comprehensive live weather telemetry, hourly, and 7-day forecasts,
    and save current snapshot to WeatherHistory database.
    """
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Location query cannot be empty")
        
    # 1. Geocode Location
    GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"
    geo_params = {"name": query.strip(), "count": 1, "language": "en", "format": "json"}
    
    try:
        geo_resp = requests.get(GEO_URL, params=geo_params, timeout=5)
        geo_resp.raise_for_status()
        geo_data = geo_resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Geocoding failure: {str(e)}")
        
    if not geo_data.get("results"):
        raise HTTPException(status_code=404, detail="Location not found in weather index")
        
    loc = geo_data["results"][0]
    lat = loc["latitude"]
    lon = loc["longitude"]
    loc_name = loc["name"]
    state = loc.get("admin1", "N/A")
    country = loc.get("country", "N/A")
    
    # 2. Query Detailed Forecast and Satellite telemetries
    WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
    weather_params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,surface_pressure,precipitation,wind_speed_10m,cloud_cover,visibility,weather_code",
        "hourly": "temperature_2m,precipitation",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
        "timezone": "auto"
    }
    
    try:
        w_resp = requests.get(WEATHER_URL, params=weather_params, timeout=5)
        w_resp.raise_for_status()
        w_data = w_resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Satellite telemetry link failed: {str(e)}")
        
    current = w_data.get("current", {})
    temp = current.get("temperature_2m", 25.0)
    humidity = current.get("relative_humidity_2m", 50.0)
    pressure = current.get("surface_pressure", 1013.25)
    rain = current.get("precipitation", 0.0)
    wind_speed = current.get("wind_speed_10m", 10.0)
    cloud_cover = current.get("cloud_cover", 0.0)
    visibility = current.get("visibility", 10000.0) / 1000.0 # convert to km
    weather_code = current.get("weather_code", 0)
    condition = get_weather_code_text(weather_code)
    
    # 3. Save to WeatherHistory database
    history_entry = WeatherHistory(
        location_name=f"{loc_name}, {state}",
        latitude=lat,
        longitude=lon,
        temperature=temp,
        humidity=humidity,
        pressure=pressure,
        rainfall=rain,
        wind_speed=wind_speed,
        cloud_cover=cloud_cover,
        visibility=visibility,
        condition=condition
    )
    db.add(history_entry)
    db.commit()
    
    # 4. Formulate response
    hourly = w_data.get("hourly", {})
    hourly_times = hourly.get("time", [])[:24]
    hourly_temps = hourly.get("temperature_2m", [])[:24]
    hourly_rains = hourly.get("precipitation", [])[:24]
    
    hourly_forecast = []
    for i in range(len(hourly_times)):
        hourly_forecast.append({
            "time": hourly_times[i].split("T")[1][:5], # just HH:MM
            "temperature": hourly_temps[i],
            "rain": hourly_rains[i]
        })
        
    daily = w_data.get("daily", {})
    daily_times = daily.get("time", [])[:7]
    daily_maxes = daily.get("temperature_2m_max", [])[:7]
    daily_mins = daily.get("temperature_2m_min", [])[:7]
    daily_rains = daily.get("precipitation_sum", [])[:7]
    daily_codes = daily.get("weather_code", [])[:7]
    
    daily_forecast = []
    for i in range(len(daily_times)):
        dt = datetime.strptime(daily_times[i], "%Y-%m-%d")
        day_name = dt.strftime("%a") # e.g. Mon, Tue
        daily_forecast.append({
            "day": day_name,
            "date": daily_times[i],
            "temp_max": daily_maxes[i],
            "temp_min": daily_mins[i],
            "rain": daily_rains[i],
            "condition": get_weather_code_text(daily_codes[i])
        })
        
    return {
        "location": {
            "name": loc_name,
            "state": state,
            "country": country,
            "latitude": lat,
            "longitude": lon
        },
        "current": {
            "temperature": temp,
            "humidity": humidity,
            "pressure": pressure,
            "rainfall": rain,
            "wind_speed": wind_speed,
            "cloud_cover": cloud_cover,
            "visibility": visibility,
            "condition": condition
        },
        "hourly": hourly_forecast,
        "daily": daily_forecast
    }

@router.get("/history")
def get_weather_history(query: str, db: Session = Depends(get_db)):
    """
    Get the last 15 weather logs for a location to feed trend graphs.
    """
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Location query cannot be empty")
        
    # Query case-insensitive match for the location name
    search_pattern = f"%{query.strip()}%"
    records = db.query(WeatherHistory).filter(
        WeatherHistory.location_name.like(search_pattern)
    ).order_by(WeatherHistory.recorded_at.desc()).limit(15).all()
    
    # Reverse so they are chronological
    records.reverse()
    
    return [
        {
            "id": r.id,
            "location_name": r.location_name,
            "temperature": r.temperature,
            "humidity": r.humidity,
            "pressure": r.pressure,
            "rainfall": r.rainfall,
            "wind_speed": r.wind_speed,
            "cloud_cover": r.cloud_cover,
            "visibility": r.visibility,
            "condition": r.condition,
            "recorded_at": r.recorded_at
        }
        for r in records
    ]
