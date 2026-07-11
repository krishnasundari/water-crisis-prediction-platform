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

    # 3. Simulate SMS & Email carriers logging
    for s in stakeholders:
        # SMS Log
        sms_log = NotificationLog(
            alert_id=alert_id,
            recipient_name=s["name"],
            recipient_role=s["role"],
            channel="sms",
            destination=s["phone"],
            status="delivered"
        )
        db.add(sms_log)

        # Email Log
        email_log = NotificationLog(
            alert_id=alert_id,
            recipient_name=s["name"],
            recipient_role=s["role"],
            channel="email",
            destination=s["email"],
            status="delivered"
        )
        db.add(email_log)

    db.commit()
    print(f"--- Notifications dispatched successfully for Alert ID {alert_id} ({target_name}) ---")
