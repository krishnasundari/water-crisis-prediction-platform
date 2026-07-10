import os
import requests
import math
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import Reservoir

# Open-Meteo API base URLs
GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast"

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) using Haversine formula
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 9999.0
    
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371  # Radius of earth in kilometers
    return round(c * r, 2)

def get_weather_code_description(code: int) -> str:
    """Convert WMO weather codes to human-readable descriptions"""
    codes = {
        0: "Clear Sky",
        1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
        45: "Foggy", 48: "Depositing Rime Fog",
        51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
        61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain",
        71: "Slight Snowfall", 73: "Moderate Snowfall", 75: "Heavy Snowfall",
        77: "Snow Grains",
        80: "Slight Rain Showers", 81: "Moderate Rain Showers", 82: "Violent Rain Showers",
        85: "Slight Snow Showers", 86: "Heavy Snow Showers",
        95: "Thunderstorm", 96: "Thunderstorm with Hail", 99: "Thunderstorm with Heavy Hail"
    }
    return codes.get(code, "Unknown Conditions")

def search_weather_and_reservoirs(db: Session, query: str) -> Dict[str, Any]:
    """
    Search a location, get coordinates, pull weather forecast, 
    and calculate distance to local reservoirs.
    """
    # 1. Geocode lookup
    geo_params = {
        "name": query,
        "count": 1,
        "language": "en",
        "format": "json"
    }
    
    try:
        geo_response = requests.get(GEOCODING_API_URL, params=geo_params, timeout=5)
        geo_response.raise_for_status()
        geo_data = geo_response.json()
    except Exception as e:
        return {"error": f"Geocoding service failed: {str(e)}"}
        
    if not geo_data.get("results"):
        return {"error": f"No locations found for query: '{query}'"}
        
    result = geo_data["results"][0]
    lat = result["latitude"]
    lon = result["longitude"]
    name = result["name"]
    country = result.get("country", "")
    admin1 = result.get("admin1", "")  # State name
    
    # 2. Get live weather and 15-day forecast
    weather_params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum",
        "timezone": "auto",
        "forecast_days": 15
    }
    
    try:
        weather_response = requests.get(WEATHER_API_URL, params=weather_params, timeout=5)
        weather_response.raise_for_status()
        weather_data = weather_response.json()
    except Exception as e:
        return {"error": f"Weather forecasting service failed: {str(e)}"}
        
    current = weather_data.get("current", {})
    daily = weather_data.get("daily", {})
    
    # Format 15-day forecast list
    forecast_list = []
    if "time" in daily:
        for i in range(len(daily["time"])):
            code = daily["weather_code"][i]
            forecast_list.append({
                "date": daily["time"][i],
                "temp_max": daily["temperature_2m_max"][i],
                "temp_min": daily["temperature_2m_min"][i],
                "precipitation": daily["precipitation_sum"][i],
                "rain": daily["rain_sum"][i],
                "weather_code": code,
                "condition": get_weather_code_description(code)
            })
            
    current_code = current.get("weather_code", 0)
    
    # 3. Find closest reservoirs and calculate distance
    reservoirs = db.query(Reservoir).all()
    nearby_reservoirs = []
    
    # Calculate simulated level adjustment based on current live rainfall
    live_rain = current.get("rain", 0.0) or current.get("precipitation", 0.0) or 0.0
    
    for res in reservoirs:
        dist = calculate_distance(lat, lon, res.latitude, res.longitude)
        
        # Hydrological Simulation: If it is currently raining in this region,
        # let's dynamically simulate water level changes on the fly!
        base_pct = round((res.current_level / res.capacity) * 100, 2)
        simulated_pct = base_pct
        if live_rain > 0 and dist < 250: # Close proximity
            # Dynamic simulation: 1mm of rain adds 0.15% to dam level
            rain_fill_factor = live_rain * 0.15
            simulated_pct = min(100.0, round(base_pct + rain_fill_factor, 2))
            
        nearby_reservoirs.append({
            "id": res.id,
            "name": res.name,
            "capacity": res.capacity,
            "original_level": base_pct,
            "current_level": simulated_pct, # simulated live percentage level
            "district": res.district,
            "state": res.state,
            "latitude": res.latitude,
            "longitude": res.longitude,
            "distance_km": round(dist, 2),
            "inflow_added_pct": round(simulated_pct - base_pct, 2)
        })
        
    # Sort nearby reservoirs by distance
    nearby_reservoirs.sort(key=lambda x: x["distance_km"])
    
    # Filter only top 5 nearby
    nearby_reservoirs = nearby_reservoirs[:5]
    
    return {
        "location": {
            "name": name,
            "state": admin1,
            "country": country,
            "latitude": lat,
            "longitude": lon
        },
        "current_weather": {
            "temperature": current.get("temperature_2m"),
            "feels_like": current.get("apparent_temperature"),
            "humidity": current.get("relative_humidity_2m"),
            "precipitation": current.get("precipitation"),
            "rain": live_rain,
            "wind_speed": current.get("wind_speed_10m"),
            "weather_code": current_code,
            "condition": get_weather_code_description(current_code)
        },
        "forecast_15_days": forecast_list,
        "nearby_reservoirs": nearby_reservoirs
    }
