from google.oauth2 import id_token
from google.auth.transport import requests
import os
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.schemas import (
    LoginRequest, 
    TokenResponse, 
    UserCreate, 
    UserResponse,
    GoogleLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_active_user,
    register_user,
    decode_token,
    hash_password,
)
from app.models.models import User, PasswordResetOTP, Role
from app.services.email_service import send_otp_email

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_create: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user
    
    - **email**: User email address (must be unique)
    - **username**: Username (must be unique, 3-100 chars)
    - **full_name**: User's full name (optional)
    - **password**: Password (minimum 8 characters)
    - **role**: User role (admin, analyst, or government_officer)
    """
    db_user = register_user(db, user_create)
    
    return UserResponse(
        id=db_user.id,
        email=db_user.email,
        username=db_user.username,
        full_name=db_user.full_name,
        role=db_user.role.name if db_user.role else None,
        is_active=db_user.is_active,
        created_at=db_user.created_at,
    )

@router.post("/google", response_model=TokenResponse)
async def google_login(data: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        from app.core.config import settings
        user_info = id_token.verify_oauth2_token(
            data.credential,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )

        email = user_info["email"]
        name = user_info.get("name", "")
        username = email.split("@")[0]

        # Check if user exists
        user = db.query(User).filter(User.email == email).first()

        # Create user if not found
        if not user:
            role = db.query(Role).filter(Role.name == "government_officer").first()
            role_id = role.id if role else 3
            
            user = User(
                email=email,
                username=username,
                full_name=name,
                hashed_password=hash_password("GOOGLE_AUTH_USER"),
                role_id=role_id,
                is_active=True,
            )

            db.add(user)
            db.commit()
            db.refresh(user)

        access_token = create_access_token({"sub": user.email})
        refresh_token = create_refresh_token({"sub": user.email})

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 15 * 60,
        }

    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=str(e),
        )

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email address not registered on this platform."
        )
        
    # Generate 6-digit numeric OTP
    otp = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Delete any existing OTP entries for this email
    db.query(PasswordResetOTP).filter(PasswordResetOTP.email == email).delete()
    
    # Create new OTP entry
    db_otp = PasswordResetOTP(
        email=email,
        otp_code=otp,
        expires_at=expires_at,
        is_verified=False
    )
    db.add(db_otp)
    db.commit()
    
    # Send email containing OTP code
    await send_otp_email(email, otp)
    
    return {"message": "Verification OTP code sent to your email successfully."}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    otp_code = data.otp_code.strip()
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email address not found."
        )
        
    db_otp = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.email == email,
        PasswordResetOTP.otp_code == otp_code
    ).first()
    
    if not db_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP verification code."
        )
        
    if db_otp.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired."
        )
        
    # Update password using direct bcrypt hashing
    user.hashed_password = hash_password(data.new_password)
    
    # Invalidate OTP entry
    db.delete(db_otp)
    db.commit()
    
    return {"message": "Password updated successfully. Please log in with your new credentials."}
@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    User login - returns JWT tokens
    
    - **email**: User email
    - **password**: User password
    
    Returns access token, refresh token, and token type
    """
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token({"sub": user.email})
    refresh_token = create_refresh_token({"sub": user.email})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 15 * 60  # 15 minutes in seconds
    }

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: dict):
    """
    Refresh access token using refresh token
    
    - **refresh_token**: Valid refresh token from login
    """
    if "refresh_token" not in request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token required"
        )
    
    payload = decode_token(request["refresh_token"])
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    email = payload.get("sub")
    access_token = create_access_token({"sub": email})
    refresh_token = create_refresh_token({"sub": email})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 15 * 60
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get current user information
    
    Requires valid JWT token in Authorization header
    """
    return current_user

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    """
    Logout user (client should discard token)
    """
    return {"message": "Successfully logged out"}
