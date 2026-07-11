from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.database import get_db
from app.models.models import (
    AIConversation,
    Prediction,
    Reservoir,
    Alert,
    Village
)
from app.schemas.schemas import AIMessageRequest

router = APIRouter()


@router.post("/chat")
def chat(
    request: AIMessageRequest,
    db: Session = Depends(get_db)
):
    total_villages = db.query(Village).count()

    high_risk = db.query(Prediction).filter(
        Prediction.risk_level == "High"
    ).count()

    active_alerts = db.query(Alert).filter(
        Alert.is_read == False
    ).count()

    low_reservoirs = db.query(Reservoir).filter(
        Reservoir.current_level < (Reservoir.capacity * 0.40)
    ).count()

    user_message = request.message.lower()

    if "risk" in user_message:
        assistant_response = (
            f"There are currently {high_risk} high-risk prediction(s). "
            "Priority should be given to water conservation, "
            "continuous monitoring, and awareness campaigns."
        )

    elif "reservoir" in user_message:
        assistant_response = (
            f"{low_reservoirs} reservoir(s) are below 40% capacity. "
            "It is recommended to optimize reservoir releases "
            "and promote rainwater harvesting."
        )

    elif "alert" in user_message or "threat" in user_message or "warning" in user_message:
        recent = db.query(Alert).filter(Alert.is_read == False).order_by(Alert.created_at.desc()).limit(5).all()
        if recent:
            msg_list = "\n".join([f"• [{a.severity.upper()} - {a.alert_type}] {a.message}" for a in recent])
            assistant_response = (
                f"There are currently {active_alerts} active alert(s) in the system:\n\n{msg_list}\n\n"
                "Recommended response checklist:\n"
                "1. Verify gauge values with site engineers.\n"
                "2. Dispatch emergency warnings to downstream villages.\n"
                "3. Coordinate with district disaster authorities."
            )
        else:
            assistant_response = "All systems green! There are no unresolved active alerts in the database."

    elif "village" in user_message:
        assistant_response = (
            f"The platform currently manages {total_villages} village(s). "
            "Continue monitoring groundwater levels and rainfall trends."
        )

    else:
        assistant_response = (
            "AI Recommendation:\n\n"
            "• Monitor rainfall continuously.\n"
            "• Protect groundwater resources.\n"
            "• Improve rainwater harvesting.\n"
            "• Track reservoir utilization regularly.\n"
            "• Respond quickly to High Risk predictions."
        )

    conversation = AIConversation(
        user_message=request.message,
        assistant_response=assistant_response,
        created_at=datetime.now()
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return {
        "user_message": conversation.user_message,
        "assistant_response": conversation.assistant_response,
        "created_at": conversation.created_at
    }


@router.get("/history")
def history(
    db: Session = Depends(get_db)
):
    conversations = (
        db.query(AIConversation)
        .order_by(AIConversation.created_at.desc())
        .all()
    )

    return conversations


@router.delete("/history")
def clear_history(
    db: Session = Depends(get_db)
):
    db.query(AIConversation).delete()
    db.commit()

    return {
        "message": "AI conversation history cleared successfully."
    }


@router.get("/recommendations")
def recommendations(
    db: Session = Depends(get_db)
):
    high_risk = db.query(Prediction).filter(
        Prediction.risk_level == "High"
    ).count()

    active_alerts = db.query(Alert).filter(
        Alert.is_read == False
    ).count()

    low_reservoirs = db.query(Reservoir).filter(
        Reservoir.current_level < (Reservoir.capacity * 0.40)
    ).count()

    recommendations = []

    if high_risk > 0:
        recommendations.append(
            "Increase water conservation measures in high-risk villages."
        )

    if low_reservoirs > 0:
        recommendations.append(
            "Implement rainwater harvesting and optimize reservoir usage."
        )

    if active_alerts > 0:
        recommendations.append(
            "Review unresolved alerts immediately."
        )

    if len(recommendations) == 0:
        recommendations.append(
            "Current water resources are stable. Continue regular monitoring."
        )

    return {
        "high_risk_predictions": high_risk,
        "low_reservoirs": low_reservoirs,
        "active_alerts": active_alerts,
        "recommendations": recommendations
    }