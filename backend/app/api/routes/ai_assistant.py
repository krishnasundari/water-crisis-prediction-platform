import re
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.database import get_db
from app.models.models import (
    AIConversation,
    Prediction,
    Reservoir,
    Alert,
)
from app.schemas.schemas import AIMessageRequest
from app.services.grounded_ai_service import grounded_ai_assistant

router = APIRouter()


@router.post("/chat")
def chat(
    request: AIMessageRequest,
    db: Session = Depends(get_db)
):
    """
    Conversational AI Assistant endpoint providing comprehensive ChatGPT-style responses
    grounded in live database telemetry, disaster intelligence, and water conservation expertise.
    """
    user_message = request.message
    assistant_response = grounded_ai_assistant.generate_chat_response(user_message, db=db)

    # Write conversation log
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


@router.post("/grounded-query")
def grounded_query(
    request: AIMessageRequest,
    db: Session = Depends(get_db)
):
    """
    Evidence-backed grounded AI query endpoint.
    Returns the assistant's answer along with exact database evidence citations and provenance.
    """
    result = grounded_ai_assistant.generate_grounded_response(request.message, db=db)
    
    # Save conversation log
    conversation = AIConversation(
        user_message=request.message,
        assistant_response=result["response"],
        created_at=datetime.now()
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return {
        "user_message": conversation.user_message,
        "assistant_response": conversation.assistant_response,
        "evidence_used": result["evidence_used"],
        "missing_notes": result["missing_notes"],
        "provider": result["provider"],
        "created_at": conversation.created_at,
    }
