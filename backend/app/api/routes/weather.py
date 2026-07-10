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
