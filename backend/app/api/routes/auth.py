from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.db.database import get_db
from app.schemas.schemas import LoginRequest, TokenResponse, UserCreate, UserResponse
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_active_user,
    register_user,
    decode_token,
)
from app.models.models import User

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
    return db_user

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
