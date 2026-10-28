from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, List, Union
import json
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """Application Settings - Load from .env file"""
    
    # API Settings
    API_TITLE: str = "Water Crisis Prediction & Management Platform"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "AI-Powered Water Resource Management System"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./water_crisis.db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT Settings
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 15
    JWT_REFRESH_EXPIRATION_DAYS: int = 7
    
    # Security - Explicit origins preferred over wildcard
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://water-crisis-platform-frontend.onrender.com",
        "https://water-crisis-prediction-platform-1.onrender.com",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def is_jwt_secret_secure(self) -> bool:
        return (
            self.JWT_SECRET_KEY != "your-super-secret-key-change-in-production"
            and len(self.JWT_SECRET_KEY) >= 32
        )
    
    # OpenAI Settings
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = "477358386706-ru8cmef0bgtclpvfhqsrf1fq1ddbc76r.apps.googleusercontent.com"
    
    # Email Settings
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_EMAIL: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    # Initial Admin Seed Password (override via ADMIN_DEFAULT_PASSWORD env)
    ADMIN_DEFAULT_PASSWORD: str = "Admin@123"

    # ML Settings
    ML_MODEL_PATH: str = "./ml_models"
    PREDICTION_CACHE_TTL: int = 86400  # 24 hours
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # Emergency Alert Safety Gate (Do not send public notifications in dev/test)
    ENABLE_PUBLIC_EMERGENCY_NOTIFICATIONS: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
