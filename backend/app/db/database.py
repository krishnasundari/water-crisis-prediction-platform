from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import settings

# Force SQLite if DATABASE_URL is the default placeholder or not set properly
_db_url = settings.DATABASE_URL
if not _db_url or "your_db" in _db_url or "YOUR_DB" in _db_url:
    _db_url = "sqlite:///./water_crisis.db"

# Database engine
engine = create_engine(
    _db_url,
    poolclass=NullPool,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False} if "sqlite" in _db_url else {}
)

# SQLite optimization event listeners
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in _db_url:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-64000")  # 64MB cache
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.close()

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
