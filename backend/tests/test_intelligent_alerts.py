"""
Automated Test Suite for Intelligent Alert System (Prompt 15).
Validates:
- Threshold-based rule evaluation (river breach, approaching warning, reservoir surcharge, drought).
- Precise mathematical rationale recording (trigger_reason).
- Duplicate prevention (idempotent repeated evaluation).
- Stale data & insufficient evidence safeguards (downgrades severity, avoids false confidence).
- Lifecycle state machine (active -> acknowledged -> resolved).
- Automatic resolution when conditions return to normal bounds.
- Safety gate preventing public emergency transmissions during development.
- API endpoints for acknowledgement, resolution, and filtering.
"""

import json
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.models.models import Alert, River, Reservoir, RainfallRecord, NotificationLog
from app.services.alert_service import AlertService, alert_service
from app.core.config import settings

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# =====================================================================
# 1. Rule 1: River Danger Level Breach
# =====================================================================

def test_river_danger_breach_rule(test_db):
    river = River(
        name="Kosi River at Baltara",
        river_level=35.5,
        danger_level=33.85,
        flow_rate=4500.0,
        trend="Rising",
        data_source="Central Water Commission",
        data_status="Observed",
        last_updated_at=datetime.utcnow(),
    )
    test_db.add(river)
    test_db.commit()

    service = AlertService()
    res = service.evaluate_all_rules(test_db)
    assert res["created"] >= 1

    alert = (
        test_db.query(Alert)
        .filter(Alert.river_id == river.id, Alert.alert_type == "flood")
        .first()
    )
    assert alert is not None
    assert alert.status == "active"
    assert alert.severity == "critical"
    assert alert.is_official is False
    assert "breached danger level" in alert.trigger_reason.lower()
    assert "35.50m" in alert.trigger_reason
    assert "33.85m" in alert.trigger_reason
    assert alert.telemetry_snapshot is not None
    assert "status_history" in alert.__dict__ or alert.status_history is not None


# =====================================================================
# 2. Rule 2: River Warning Approaching Threshold
# =====================================================================

def test_river_warning_approaching_rule(test_db):
    river = River(
        name="Yamuna at Delhi Railway Bridge",
        river_level=204.8,  # Danger level is 205.33 -> 99.7% of danger
        danger_level=205.33,
        flow_rate=1800.0,
        trend="Rising",
        data_source="Central Water Commission",
        data_status="Observed",
        last_updated_at=datetime.utcnow(),
    )
    test_db.add(river)
    test_db.commit()

    service = AlertService()
    service.evaluate_all_rules(test_db)

    alert = (
        test_db.query(Alert)
        .filter(Alert.river_id == river.id, Alert.alert_type == "flood")
        .first()
    )
    assert alert is not None
    assert alert.status == "active"
    assert alert.severity == "high"
    assert "approaching danger level" in alert.trigger_reason.lower()


# =====================================================================
# 3. Rule 3: Reservoir Overflow & Spill Threat
# =====================================================================

def test_reservoir_overflow_threat_rule(test_db):
    res = Reservoir(
        name="Idukki Reservoir",
        district="Idukki",
        state="Kerala",
        latitude=9.85,
        longitude=76.97,
        capacity=2000.0,
        current_level=1940.0,  # 97% fullness
        data_source="CWC Bulletin",
        data_status="Observed",
        last_updated_at=datetime.utcnow(),
    )
    test_db.add(res)
    test_db.commit()

    # Heavy rainfall recorded within 24h
    rain = RainfallRecord(
        reservoir_id=res.id,
        district="Idukki",
        rainfall_amount=55.0,
        measurement_date=datetime.utcnow() - timedelta(hours=6),
    )
    test_db.add(rain)
    test_db.commit()

    service = AlertService()
    service.evaluate_all_rules(test_db)

    alert = (
        test_db.query(Alert)
        .filter(Alert.reservoir_id == res.id, Alert.alert_type == "reservoir")
        .first()
    )
    assert alert is not None
    assert alert.severity == "high"
    assert "surcharge capacity" in alert.trigger_reason.lower()
    assert "55.0mm" in alert.trigger_reason


# =====================================================================
# 4. Rule 4: Reservoir Depletion / Drought Crisis
# =====================================================================

def test_reservoir_storage_crisis_rule(test_db):
    res = Reservoir(
        name="Jayakwadi Dam",
        district="Aurangabad",
        state="Maharashtra",
        latitude=19.49,
        longitude=75.38,
        capacity=2170.0,
        current_level=210.0,  # <10% capacity
        data_source="CWC Bulletin",
        data_status="Observed",
        last_updated_at=datetime.utcnow(),
    )
    test_db.add(res)
    test_db.commit()

    service = AlertService()
    service.evaluate_all_rules(test_db)

    alert = (
        test_db.query(Alert)
        .filter(Alert.reservoir_id == res.id, Alert.alert_type == "drought")
        .first()
    )
    assert alert is not None
    assert alert.severity == "critical"
    assert "storage critically depleted" in alert.trigger_reason.lower()


# =====================================================================
# 5. Duplicate Prevention During Repeated Synchronization
# =====================================================================

def test_duplicate_prevention_on_repeated_evaluation(test_db):
    service = AlertService()
    river = test_db.query(River).filter(River.name == "Kosi River at Baltara").first()

    # Count existing alerts
    count_before = test_db.query(Alert).filter(Alert.river_id == river.id).count()

    # Run evaluation again
    res = service.evaluate_all_rules(test_db)
    assert res["created"] == 0  # No new alert created
    assert res["updated"] >= 1  # Existing alert updated idempotently

    count_after = test_db.query(Alert).filter(Alert.river_id == river.id).count()
    assert count_before == count_after


# =====================================================================
# 6. Stale Data Safeguards (Avoid False Confidence)
# =====================================================================

def test_stale_observations_downgrades_severity(test_db):
    # River with breached danger level but stale observation time (4 hours old)
    river = River(
        name="Tawi River at Jammu",
        river_level=12.0,
        danger_level=10.0,
        flow_rate=900.0,
        trend="Rising",
        data_source="Central Water Commission",
        data_status="Observed",
        last_updated_at=datetime.utcnow() - timedelta(hours=4),  # STALE
    )
    test_db.add(river)
    test_db.commit()

    service = AlertService()
    service.evaluate_all_rules(test_db)

    alert = test_db.query(Alert).filter(Alert.river_id == river.id).first()
    assert alert is not None
    # Capped at medium due to stale telemetry
    assert alert.severity == "medium"
    assert "DATA QUALITY ADVISORY: Stale Telemetry" in alert.trigger_reason


# =====================================================================
# 7. Operator Acknowledgement & Resolution Lifecycles
# =====================================================================

def test_alert_acknowledgement_lifecycle(test_db):
    service = AlertService()
    alert = test_db.query(Alert).filter(Alert.status == "active").first()
    assert alert is not None

    ack = service.acknowledge_alert(test_db, alert.id, user_identifier="DisasterOfficer_Patel")
    assert ack.status == "acknowledged"
    assert ack.acknowledged_by == "DisasterOfficer_Patel"
    assert ack.acknowledged_at is not None
    assert ack.is_read is True

    # Audit history includes transition
    history = json.loads(ack.status_history)
    assert any(h["status"] == "acknowledged" and h["actor"] == "DisasterOfficer_Patel" for h in history)


def test_alert_resolution_lifecycle(test_db):
    service = AlertService()
    alert = test_db.query(Alert).filter(Alert.status == "acknowledged").first()
    assert alert is not None

    resolved = service.resolve_alert(
        test_db,
        alert.id,
        resolution_notes="Embankments reinforced and stage has returned to safe operational zone.",
        user_identifier="SuperintendingEngineer_Sharma",
    )
    assert resolved.status == "resolved"
    assert resolved.resolved_by == "SuperintendingEngineer_Sharma"
    assert resolved.resolved_at is not None
    assert "Embankments reinforced" in resolved.resolution_notes

    history = json.loads(resolved.status_history)
    assert any(h["status"] == "resolved" and "reinforced" in h["note"] for h in history)


# =====================================================================
# 8. Auto-Resolution When Conditions Subside
# =====================================================================

def test_auto_resolution_when_river_stage_drops(test_db):
    service = AlertService()
    river = test_db.query(River).filter(River.name == "Yamuna at Delhi Railway Bridge").first()

    # Drop river stage to normal level safely below 90% of 205.33m (e.g. 150.0m is ~73%)
    river.river_level = 150.0
    river.last_updated_at = datetime.utcnow()
    test_db.add(river)
    test_db.commit()

    service.evaluate_all_rules(test_db)

    alert = (
        test_db.query(Alert)
        .filter(Alert.river_id == river.id)
        .order_by(Alert.created_at.desc())
        .first()
    )
    assert alert.status == "resolved"
    assert "system_auto_resolution" in alert.resolved_by
    assert "returned to normal" in alert.resolution_notes


# =====================================================================
# 9. Public Notification Safety Gate
# =====================================================================

def test_public_notification_safety_gate(test_db):
    # Verify that in development, notification status is 'dev_simulated'
    assert getattr(settings, "ENABLE_PUBLIC_EMERGENCY_NOTIFICATIONS", False) is False

    logs = test_db.query(NotificationLog).all()
    assert len(logs) > 0
    for log in logs:
        assert log.status == "dev_simulated"


# =====================================================================
# 10. Intelligent Alerts API Endpoints
# =====================================================================

def test_api_list_alerts_with_filters(client):
    res = client.get("/api/v1/alerts/?status=resolved")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    for a in data:
        assert a["status"] == "resolved"


def test_api_evaluate_rules_endpoint(client):
    res = client.post("/api/v1/alerts/evaluate-rules")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "created" in data
    assert "updated" in data


def test_api_acknowledge_and_resolve_endpoints(client, test_db):
    # Create an active alert to test API transitions
    test_alert = Alert(
        alert_type="flood",
        severity="high",
        message="API Lifecycle Test Alert",
        is_read=False,
        status="active",
        trigger_reason="Test threshold crossed",
        issued_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    test_db.add(test_alert)
    test_db.commit()

    # Acknowledge via API
    ack_res = client.put(
        f"/api/v1/alerts/{test_alert.id}/acknowledge",
        json={"user_name": "API_Operator_Dev"},
    )
    assert ack_res.status_code == 200
    ack_data = ack_res.json()
    assert ack_data["status"] == "acknowledged"
    assert ack_data["acknowledged_by"] == "API_Operator_Dev"

    # Resolve via API
    res_res = client.put(
        f"/api/v1/alerts/{test_alert.id}/resolve",
        json={
            "resolution_notes": "Resolved via automated test API call.",
            "user_name": "API_Operator_Dev",
        },
    )
    assert res_res.status_code == 200
    res_data = res_res.json()
    assert res_data["status"] == "resolved"
    assert res_data["resolution_notes"] == "Resolved via automated test API call."
