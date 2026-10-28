import os
import re
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool, QueuePool
from app.core.config import settings

def get_normalized_database_url(raw_url: str) -> str:
    """
    Normalize DATABASE_URL for SQLAlchemy 2.0 and PostgreSQL drivers.
    Render, Heroku, Supabase, and Neon often provide 'postgres://' which
    must be converted to 'postgresql+psycopg2://' or 'postgresql://'.
    """
    if not raw_url or "your_db" in raw_url or "YOUR_DB" in raw_url:
        return "sqlite:///./water_crisis.db"
    
    url = raw_url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url

def mask_database_url(url: str) -> str:
    """Return a masked version of database URL safe for logs without exposing passwords."""
    if not url:
        return "<not-set>"
    # Mask password pattern :password@
    return re.sub(r":([^:@/]+)@", r":***@", url)

# Determine database URL
_db_url = get_normalized_database_url(settings.DATABASE_URL)
_is_sqlite = _db_url.startswith("sqlite")

# Database engine configuration with appropriate dialect pooling
if _is_sqlite:
    engine = create_engine(
        _db_url,
        poolclass=NullPool,
        echo=settings.DEBUG,
        connect_args={"check_same_thread": False}
    )
    
    # SQLite optimization event listener
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-64000")  # 64MB cache
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.close()
else:
    # PostgreSQL connection pooling with health check
    engine = create_engine(
        _db_url,
        poolclass=QueuePool,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        echo=settings.DEBUG,
    )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
