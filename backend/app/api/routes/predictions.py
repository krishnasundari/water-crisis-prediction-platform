from fastapi import APIRouter

router = APIRouter()

predictions = [
    {
        "id": 1,
        "village": "Patna Village",
        "risk_score": 22,
        "risk_level": "Safe"
    },
    {
        "id": 2,
        "village": "Nalanda Village",
        "risk_score": 58,
        "risk_level": "Moderate"
    },
    {
        "id": 3,
        "village": "Pongodu",
        "risk_score": 87,
        "risk_level": "High"
    }
]

@router.get("/")
async def list_predictions():
    return predictions

@router.post("/")
async def create_prediction():
    return {"message": "Prediction created"}

@router.get("/stats")
async def get_prediction_stats():
    return {
        "total": 3,
        "safe": 1,
        "moderate": 1,
        "high": 1
    }