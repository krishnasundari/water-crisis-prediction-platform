from pydantic_settings import BaseSettings
from typing import Optional

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
    
    # Security
    CORS_ORIGINS: list = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://water-crisis-platform-frontend.onrender.com",
]
    
    # OpenAI Settings
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"
    
    # Email Settings
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_EMAIL: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    # ML Settings
    ML_MODEL_PATH: str = "./ml_models"
    PREDICTION_CACHE_TTL: int = 86400  # 24 hours
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
