"""
Comprehensive Security Audit Test Suite
========================================
Validates security controls implemented under Prompt 18:
1. JWT validation, expiration, and token-type separation (access vs refresh).
2. HTTP Authorization Bearer extraction and inactive account blocking.
3. Role-based access control and admin endpoint protection.
4. Google OAuth security (email verification, high-entropy passwords).
5. Password reset strength and account enumeration protection.
6. Path traversal mitigation on report downloads.
7. In-memory rate limiting with HTTP 429 and Retry-After headers.
"""

import pytest
from datetime import datetime, timedelta
from jose import jwt
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from sqlalchemy import create_engine

from app.main import app
from app.core.config import settings
from app.core.rate_limiter import auth_rate_limiter, password_reset_rate_limiter
from app.db.database import Base, get_db
from app.models.models import User, Role, Report, PasswordResetOTP
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    hash_password,
)


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = Session(engine)

    # Seed roles
    admin_role = Role(id=1, name="admin", description="Administrator")
    analyst_role = Role(id=2, name="analyst", description="Data Analyst")
    officer_role = Role(id=3, name="government_officer", description="Government Officer")
    session.add_all([admin_role, analyst_role, officer_role])
    session.commit()

    # Seed admin user
    admin_user = User(
        email="admin@security.audit",
        username="admin_sec",
        full_name="Admin Sec",
        hashed_password=hash_password("StrongAdminPass@123"),
        role_id=admin_role.id,
        is_active=True,
    )

    # Seed standard analyst user
    officer_user = User(
        email="officer@security.audit",
        username="officer_sec",
        full_name="Officer Sec",
        hashed_password=hash_password("StrongOfficerPass@123"),
        role_id=officer_role.id,
        is_active=True,
    )

    # Seed inactive user
    inactive_user = User(
        email="inactive@security.audit",
        username="inactive_sec",
        full_name="Inactive Sec",
        hashed_password=hash_password("InactivePass@123"),
        role_id=officer_role.id,
        is_active=False,
    )

    session.add_all([admin_user, officer_user, inactive_user])
    session.commit()

    yield session
    session.close()


@pytest.fixture
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    # Reset rate limiters before tests
    auth_rate_limiter.reset()
    password_reset_rate_limiter.reset()

    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# =====================================================================
# 1. JWT Security & Expiration
# =====================================================================

def test_jwt_expired_token_rejected(client):
    """Expired access token must return 401 with 'Token has expired'"""
    # Forge expired token
    expired_payload = {
        "sub": "admin@security.audit",
        "exp": datetime.utcnow() - timedelta(minutes=5),
        "type": "access",
    }
    expired_token = jwt.encode(expired_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower()


def test_refresh_token_cannot_access_protected_endpoint(client):
    """Refresh tokens (valid 7 days) MUST NOT be usable as access tokens"""
    refresh_token = create_refresh_token({"sub": "admin@security.audit"})

    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {refresh_token}"})
    assert res.status_code == 401
    assert "refresh token cannot be used" in res.json()["detail"].lower()


def test_bearer_authorization_header_success(client):
    """Valid access token in Authorization: Bearer <token> must return authenticated user"""
    token = create_access_token({"sub": "admin@security.audit"})

    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "admin@security.audit"
    assert data["username"] == "admin_sec"


def test_inactive_user_access_blocked(client):
    """Deactivated accounts must receive 403 Forbidden even with valid JWT"""
    token = create_access_token({"sub": "inactive@security.audit"})

    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert "inactive" in res.json()["detail"].lower()


# =====================================================================
# 2. Role-Based Authorization on Admin Endpoints
# =====================================================================

def test_admin_endpoint_rejects_non_admin(client):
    """Non-admin user (government_officer) receives 403 on admin routes"""
    officer_token = create_access_token({"sub": "officer@security.audit"})

    res = client.get(
        "/api/v1/admin/sync-status",
        headers={"Authorization": f"Bearer {officer_token}"},
    )
    assert res.status_code == 403
    assert "admin role required" in res.json()["detail"].lower()


def test_admin_endpoint_allows_admin(client):
    """Admin user receives 200 on admin diagnostic endpoint"""
    admin_token = create_access_token({"sub": "admin@security.audit"})

    res = client.get(
        "/api/v1/admin/sync-status",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "diagnostics" in data


# =====================================================================
# 3. Google OAuth Security
# =====================================================================

def test_google_oauth_rejects_unverified_email(client, monkeypatch):
    """Google OAuth must reject tokens with unverified email"""
    from google.oauth2 import id_token

    def mock_verify_oauth2_token(token, request, audience):
        return {
            "email": "hacker@test.com",
            "email_verified": False,
            "name": "Unverified User",
        }

    monkeypatch.setattr(id_token, "verify_oauth2_token", mock_verify_oauth2_token)

    res = client.post("/api/v1/auth/google", json={"credential": "mock_google_id_token_12345"})
    assert res.status_code == 400
    assert "email is not verified" in res.json()["detail"].lower()


def test_google_oauth_unique_password_entropy(client, test_db, monkeypatch):
    """Google OAuth users must NOT be provisioned with guessable passwords"""
    from google.oauth2 import id_token

    def mock_verify_oauth2_token(token, request, audience):
        return {
            "email": "newgoogleuser@security.audit",
            "email_verified": True,
            "name": "New Google User",
        }

    monkeypatch.setattr(id_token, "verify_oauth2_token", mock_verify_oauth2_token)

    res = client.post("/api/v1/auth/google", json={"credential": "valid_mock_token_12345"})
    assert res.status_code == 200

    # Ensure password cannot be 'GOOGLE_AUTH_USER'
    login_attempt = client.post(
        "/api/v1/auth/login",
        json={"email": "newgoogleuser@security.audit", "password": "GOOGLE_AUTH_USER"},
    )
    assert login_attempt.status_code == 401


# =====================================================================
# 4. Password Security & Account Enumeration Prevention
# =====================================================================

def test_forgot_password_no_account_enumeration(client):
    """Forgot password returns identical generic success for unregistered emails"""
    res = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nonexistent_victim_12345@security.audit"},
    )
    assert res.status_code == 200
    assert "verification otp code sent" in res.json()["message"].lower()


def test_reset_password_length_validation(client):
    """Password reset must enforce minimum 8 characters"""
    res = client.post(
        "/api/v1/auth/reset-password",
        json={
            "email": "officer@security.audit",
            "otp_code": "123456",
            "new_password": "short",
        },
    )
    assert res.status_code == 422  # Pydantic validation error


# =====================================================================
# 5. Path Traversal Mitigation on Reports
# =====================================================================

def test_reports_path_traversal_blocked(client, test_db):
    """Attempts to download files outside REPORTS_DIR must return 404"""
    # Create malicious report row referencing outside file
    malicious_report = Report(
        title="Path Traversal Attempt",
        report_type="pdf",
        file_path="../../etc/passwd",
        filters="{}",
        created_at=datetime.utcnow(),
    )
    test_db.add(malicious_report)
    test_db.commit()

    res = client.get(f"/api/v1/reports/{malicious_report.id}/download")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


# =====================================================================
# 6. In-Memory Rate Limiting
# =====================================================================

def test_rate_limiter_throttles_burst_traffic(client):
    """Excessive rapid login attempts trigger HTTP 429 Too Many Requests"""
    # Configure limiter to lower threshold for fast test
    auth_rate_limiter.requests_limit = 5
    auth_rate_limiter.reset()

    login_payload = {
        "email": "officer@security.audit",
        "password": "wrong_password",
    }

    # First 5 attempts return 401
    for _ in range(5):
        r = client.post("/api/v1/auth/login", json=login_payload)
        assert r.status_code == 401

    # 6th attempt should be blocked by rate limiter
    r6 = client.post("/api/v1/auth/login", json=login_payload)
    assert r6.status_code == 429
    assert "too many requests" in r6.json()["detail"].lower()
    assert "Retry-After" in r6.headers

    # Restore default limit
    auth_rate_limiter.requests_limit = 20
    auth_rate_limiter.reset()
