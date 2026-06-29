from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Alert
from app.schemas.schemas import AlertCreate

router = APIRouter()


@router.get("/")
def list_alerts(db: Session = Depends(get_db)):
    return (
        db.query(Alert)
        .order_by(Alert.created_at.desc())
        .all()
    )

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
        created_at=datetime.now()
    )

    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    print("===== ALERT SAVED =====", new_alert.id)

    return new_alert
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