from fastapi import APIRouter

router = APIRouter()

alerts = [
    {
        "id": 1,
        "village": "Pongodu",
        "severity": "CRITICAL",
        "message": "Water shortage expected within 15 days"
    },
    {
        "id": 2,
        "village": "Nalanda Village",
        "severity": "MEDIUM",
        "message": "Reservoir level decreasing"
    }
]

@router.get("/")
async def get_alerts():
    return alerts