from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Alert
from app.schemas.schemas import AlertCreate

router = APIRouter()


from typing import Optional
from pydantic import BaseModel

class AcknowledgeRequest(BaseModel):
    user_name: Optional[str] = "Operator"

class ResolveRequest(BaseModel):
    resolution_notes: str
    user_name: Optional[str] = "Operator"

@router.get("/")
def list_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    is_official: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Alert)
    if status and status != "all":
        query = query.filter(Alert.status == status)
    if severity and severity != "all":
        query = query.filter(Alert.severity == severity)
    if alert_type and alert_type != "all":
        query = query.filter(Alert.alert_type == alert_type)
    if is_official is not None:
        query = query.filter(Alert.is_official == is_official)

    return (
        query
        .order_by(Alert.created_at.desc())
        .all()
    )

@router.post("/evaluate-rules")
def evaluate_alert_rules(db: Session = Depends(get_db)):
    """
    Trigger evaluation of documented hydrological alert rules.
    Prevents duplicates and auto-resolves subsided conditions.
    """
    from app.services.alert_service import alert_service
    return alert_service.evaluate_all_rules(db=db)

@router.put("/{alert_id}/acknowledge")
def acknowledge_alert_endpoint(
    alert_id: int,
    payload: Optional[AcknowledgeRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Operator acknowledges an alert. Records timestamp and actor.
    """
    from app.services.alert_service import alert_service
    user_name = payload.user_name if payload else "Operator"
    try:
        updated = alert_service.acknowledge_alert(db, alert_id, user_identifier=user_name)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{alert_id}/resolve")
def resolve_alert_endpoint(
    alert_id: int,
    payload: ResolveRequest,
    db: Session = Depends(get_db),
):
    """
    Resolve an alert with mandatory resolution notes and operator identification.
    """
    from app.services.alert_service import alert_service
    try:
        updated = alert_service.resolve_alert(
            db,
            alert_id=alert_id,
            resolution_notes=payload.resolution_notes,
            user_identifier=payload.user_name,
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/")
def create_alert(
    alert: AlertCreate,
    db: Session = Depends(get_db)
):
    print("===== CREATE ALERT API CALLED =====")

    new_alert = Alert(
        village_id=alert.village_id,
        reservoir_id=alert.reservoir_id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        message=alert.message,
        is_read=False,
        data_source="AI Prediction Engine",
        issued_at=datetime.now(),
        created_at=datetime.now()
    )

    db.add(new_alert)
    db.flush() # flush to get auto-incremented alert id
    
    # Dispatch notifications immediately
    from app.services.notification_service import dispatch_alert_notifications
    dispatch_alert_notifications(
        db,
        new_alert.id,
        village_id=alert.village_id,
        reservoir_id=alert.reservoir_id
    )
    
    db.commit()
    db.refresh(new_alert)

    print("===== ALERT SAVED =====", new_alert.id)

    return new_alert

@router.get("/{alert_id}/notifications")
def get_alert_notifications(
    alert_id: int,
    db: Session = Depends(get_db)
):
    from app.models.models import NotificationLog
    logs = (
        db.query(NotificationLog)
        .filter(NotificationLog.alert_id == alert_id)
        .order_by(NotificationLog.sent_at.asc())
        .all()
    )
    return logs
@router.put("/{alert_id}/read")
def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db)
):

    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id)
        .first()
    )

    if not alert:
        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    alert.is_read = True

    db.commit()
    db.refresh(alert)

    return alert


@router.delete("/{alert_id}")
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):

    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id)
        .first()
    )

    if not alert:
        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    db.delete(alert)
    db.commit()

    return {
        "message": "Alert deleted successfully"
    }