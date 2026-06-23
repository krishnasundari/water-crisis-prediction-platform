from fastapi import APIRouter

router = APIRouter()

@router.get("/{reservoir_id}")
async def get_forecast(reservoir_id: int):
    return {"reservoir_id": reservoir_id, "forecast": "30, 60, 90 days"}
