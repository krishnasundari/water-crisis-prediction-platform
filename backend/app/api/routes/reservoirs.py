from fastapi import APIRouter

router = APIRouter()

# Temporary in-memory storage
reservoirs = [
    {
        "id": 1,
        "name": "Nagarjuna Sagar",
        "capacity": 400,
        "current_level": 280,
        "district": "Nalgonda",
        "state": "Telangana"
    },
    {
        "id": 2,
        "name": "Srisailam",
        "capacity": 500,
        "current_level": 350,
        "district": "Kurnool",
        "state": "Andhra Pradesh"
    }
]

@router.get("/")
async def list_reservoirs():
    return reservoirs

@router.post("/")
async def create_reservoir(reservoir: dict):
    reservoir["id"] = len(reservoirs) + 1
    reservoirs.append(reservoir)
    return {
        "message": "Reservoir created",
        "data": reservoir
    }

@router.get("/{reservoir_id}")
async def get_reservoir(reservoir_id: int):
    for reservoir in reservoirs:
        if reservoir["id"] == reservoir_id:
            return reservoir

    return {"error": "Reservoir not found"}