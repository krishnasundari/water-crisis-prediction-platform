import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime

from app.main import app
from app.db.database import get_db
from app.models.models import User, PasswordResetOTP, Role
from app.services.auth_service import hash_password, verify_password

client = TestClient(app)

def test_password_reset_flow(db_session: Session = Depends(get_db) if False else None):
    # Retrieve clean DB session directly from FastAPIs dependency override or DB setup
    # In FastAPI tests, we can query our db directly via test client or session
    # Let's register a temporary test user
    email = "test_reset_user@water.gov"
    username = "reset_user_test"
    password = "OriginalPassword@123"
    
    # 1. Register User via signup/register endpoint
    signup_data = {
        "email": email,
        "username": username,
        "full_name": "Reset Test User",
        "password": password,
        "role": "government_officer"
    }
    
    # Clear user if existing
    from app.db.database import SessionLocal
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            db.delete(existing_user)
            db.commit()
            
        existing_otp = db.query(PasswordResetOTP).filter(PasswordResetOTP.email == email).first()
        if existing_otp:
            db.delete(existing_otp)
            db.commit()
    finally:
        db.close()
        
    response = client.post("/api/v1/auth/register", json=signup_data)
    print("REGISTRATION RESPONSE:", response.status_code, response.text)
    assert response.status_code == 201
    
    # 2. Trigger Forgot Password
    forgot_data = {"email": email}
    response = client.post("/api/v1/auth/forgot-password", json=forgot_data)
    assert response.status_code == 200
    assert "Verification OTP code sent" in response.json()["message"]
    
    # 3. Read the generated OTP directly from the database to simulate reading email
    db = SessionLocal()
    try:
        otp_entry = db.query(PasswordResetOTP).filter(PasswordResetOTP.email == email).first()
        assert otp_entry is not None
        assert len(otp_entry.otp_code) == 6
        otp_code = otp_entry.otp_code
    finally:
        db.close()
        
    # 4. Attempt Password Reset with invalid OTP
    bad_reset_data = {
        "email": email,
        "otp_code": "000000",
        "new_password": "NewUpdatedPassword@123"
    }
    response = client.post("/api/v1/auth/reset-password", json=bad_reset_data)
    assert response.status_code == 400
    assert "Invalid OTP" in response.json()["detail"]
    
    # 5. Attempt Password Reset with valid OTP
    good_reset_data = {
        "email": email,
        "otp_code": otp_code,
        "new_password": "NewUpdatedPassword@123"
    }
    response = client.post("/api/v1/auth/reset-password", json=good_reset_data)
    assert response.status_code == 200
    assert "Password updated successfully" in response.json()["message"]
    
    # 6. Verify Login works with the new password
    login_data = {
        "email": email,
        "password": "NewUpdatedPassword@123"
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    token_json = response.json()
    assert "access_token" in token_json
    assert "refresh_token" in token_json
    
    # Clean up test user
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).first()
        if u:
            db.delete(u)
            db.commit()
    finally:
        db.close()
