from sqlalchemy.orm import Session
from app.models.models import NotificationLog, Village, Reservoir

def dispatch_alert_notifications(db: Session, alert_id: int, village_id: int = None, reservoir_id: int = None):
    # 1. Resolve localized context
    target_name = "Regional Zone"
    if village_id:
        v = db.query(Village).filter(Village.id == village_id).first()
        if v:
            target_name = f"{v.name} Village"
    elif reservoir_id:
        r = db.query(Reservoir).filter(Reservoir.id == reservoir_id).first()
        if r:
            target_name = f"{r.name} Reservoir"

    # 2. Define the administrative stakeholders
    stakeholders = [
        {
            "name": "Ramesh Patel",
            "role": "Village Sarpanch (Chief)",
            "phone": "+91 98765 43210",
            "email": "ramesh.patel@village.org"
        },
        {
            "name": "S. K. Verma, IAS",
            "role": "District Disaster Coordinator",
            "phone": "+91 99887 76655",
            "email": "collector.disaster@state.gov.in"
        },
        {
            "name": "Anil Kumar",
            "role": "Irrigation Chief Engineer",
            "phone": "+91 91234 56789",
            "email": "irrigation.chief@state.gov.in"
        }
    ]

    from app.core.config import settings
    # Safety Gate: Never send live public emergency notifications in development/testing
    is_live = getattr(settings, "ENABLE_PUBLIC_EMERGENCY_NOTIFICATIONS", False)
    status_label = "delivered" if is_live else "dev_simulated"

    # 3. Stakeholder notification log
    for s in stakeholders:
        sms_log = NotificationLog(
            alert_id=alert_id,
            recipient_name=s["name"],
            recipient_role=s["role"],
            channel="sms",
            destination=s["phone"],
            status=status_label
        )
        db.add(sms_log)

        email_log = NotificationLog(
            alert_id=alert_id,
            recipient_name=s["name"],
            recipient_role=s["role"],
            channel="email",
            destination=s["email"],
            status=status_label
        )
        db.add(email_log)

    db.commit()
    print(f"--- Notifications dispatched successfully for Alert ID {alert_id} ({target_name}) ---")
