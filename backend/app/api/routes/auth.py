from google.oauth2 import id_token
from google.auth.transport import requests
import os
import secrets
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limiter import auth_rate_limiter, password_reset_rate_limiter
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

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(request: Request, user_create: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user
    
    - **email**: User email address (must be unique)
    - **username**: Username (must be unique, 3-100 chars)
    - **full_name**: User's full name (optional)
    - **password**: Password (minimum 8 characters)
    - **role**: User role (admin, analyst, or government_officer)
    """
    auth_rate_limiter.check(request)
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
async def google_login(request: Request, data: GoogleLoginRequest, db: Session = Depends(get_db)):
    auth_rate_limiter.check(request)
    try:
        user_info = id_token.verify_oauth2_token(
            data.credential,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )

        # 1. Require verified email from Google ID token
        if not user_info.get("email_verified", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account email is not verified"
            )

        email = user_info["email"].strip().lower()
        name = user_info.get("name", "")
        base_username = email.split("@")[0]

        # Check if user exists
        user = db.query(User).filter(User.email == email).first()

        # Create user if not found
        if not user:
            role = db.query(Role).filter(Role.name == "government_officer").first()
            role_id = role.id if role else 3
            
            # Resolve username collisions safely
            username = base_username
            if db.query(User).filter(User.username == username).first():
                username = f"{base_username}_{secrets.token_hex(3)}"
            
            # Generate cryptographically secure random password hash (prevents password-login bypass)
            unusable_secret = secrets.token_urlsafe(32)
            user = User(
                email=email,
                username=username,
                full_name=name,
                hashed_password=hash_password(unusable_secret),
                role_id=role_id,
                is_active=True,
            )

            db.add(user)
            db.commit()
            db.refresh(user)

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated"
            )

        access_token = create_access_token({"sub": user.email})
        refresh_token = create_refresh_token({"sub": user.email})

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.JWT_EXPIRATION_MINUTES * 60,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google OAuth verification failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed or token is invalid",
        )

@router.post("/forgot-password")
async def forgot_password(request: Request, data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    password_reset_rate_limiter.check(request)
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    
    # If user exists and is active, issue OTP
    if user and user.is_active:
        # Cryptographically secure 6-digit numeric OTP
        otp = f"{secrets.randbelow(900000) + 100000}"
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
    
    # Generic response prevents account enumeration
    return {"message": "Verification OTP code sent to your email successfully."}

@router.post("/reset-password")
async def reset_password(request: Request, data: ResetPasswordRequest, db: Session = Depends(get_db)):
    password_reset_rate_limiter.check(request)
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
        db.delete(db_otp)
        db.commit()
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
async def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    User login - returns JWT tokens
    
    - **email**: User email
    - **password**: User password
    
    Returns access token, refresh token, and token type
    """
    auth_rate_limiter.check(request)
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    access_token = create_access_token({"sub": user.email})
    refresh_token = create_refresh_token({"sub": user.email})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_EXPIRATION_MINUTES * 60,
    }

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, body: dict):
    """
    Refresh access token using refresh token
    
    - **refresh_token**: Valid refresh token from login
    """
    auth_rate_limiter.check(request)
    if "refresh_token" not in body:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token required"
        )
    
    payload = decode_token(body["refresh_token"])
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
        "expires_in": settings.JWT_EXPIRATION_MINUTES * 60,
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get current user information
    
    Requires valid JWT access token in Authorization: Bearer <token> header
    """
    role_name = current_user.role.name if current_user.role else None
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        role=role_name,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    """
    Logout user (client should discard token)
    """
    return {"message": "Successfully logged out"}
