from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.db.database import engine, Base, SessionLocal
from app.api.routes import auth, villages, reservoirs, predictions, forecasts, alerts, reports, dashboard, ai_assistant, analytics, weather, websocket, rivers, evacuation, admin, flood_intelligence
import asyncio
from app.services.sync_service import sync_all_data

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

def run_schema_migrations():
    """Ensure that legacy metadata columns exist in existing database tables using dialect-aware inspection"""
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    # Column migrations only needed for existing legacy tables
    migrations = [
        ("reservoirs", "data_source", "VARCHAR(100) DEFAULT 'Estimated (Runoff Calculation)'"),
        ("reservoirs", "last_updated_at", "TIMESTAMP"),
        ("reservoirs", "data_status", "VARCHAR(50) DEFAULT 'Estimated'"),
        ("rivers", "data_source", "VARCHAR(100) DEFAULT 'Simulated Telemetry'"),
        ("rivers", "last_updated_at", "TIMESTAMP"),
        ("rivers", "data_status", "VARCHAR(50) DEFAULT 'Simulated'"),
        ("alerts", "data_source", "VARCHAR(100) DEFAULT 'AI Prediction Engine'"),
        ("alerts", "issued_at", "TIMESTAMP"),
        ("alerts", "affected_locations", "VARCHAR(255)"),
        ("alerts", "river_id", "INTEGER"),
        ("alerts", "status", "VARCHAR(30) DEFAULT 'active'"),
        ("alerts", "is_official", "BOOLEAN DEFAULT 0"),
        ("alerts", "issuing_authority", "VARCHAR(100)"),
        ("alerts", "source_identifier", "VARCHAR(100)"),
        ("alerts", "trigger_reason", "TEXT"),
        ("alerts", "valid_until", "TIMESTAMP"),
        ("alerts", "acknowledged_at", "TIMESTAMP"),
        ("alerts", "acknowledged_by", "VARCHAR(100)"),
        ("alerts", "resolved_at", "TIMESTAMP"),
        ("alerts", "resolved_by", "VARCHAR(100)"),
        ("alerts", "resolution_notes", "TEXT"),
        ("alerts", "telemetry_snapshot", "TEXT"),
        ("alerts", "status_history", "TEXT"),
    ]

    db = SessionLocal()
    try:
        for table, col_name, col_type in migrations:
            if table in existing_tables:
                columns = [col["name"] for col in inspector.get_columns(table)]
                if col_name not in columns:
                    try:
                        db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))
                        db.commit()
                        logger.info(f"Migrated {table} table: added {col_name}")
                    except Exception as e:
                        db.rollback()
                        logger.warning(f"Could not add {col_name} to {table}: {e}")
        # Non-destructive composite index migrations for high-throughput time series
        index_migrations = [
            ("ix_rainfall_records_res_date", "rainfall_records", "(reservoir_id, measurement_date)"),
            ("ix_reservoir_history_res_date", "reservoir_history", "(reservoir_id, recorded_at)"),
            ("ix_river_history_riv_date", "river_history", "(river_id, recorded_at)"),
            ("ix_villages_district_state", "villages", "(district, state)"),
            ("ix_reservoirs_district_state", "reservoirs", "(district, state)"),
            ("ix_alerts_status", "alerts", "(status)"),
            ("ix_alerts_is_official", "alerts", "(is_official)"),
            ("ix_alerts_source_id", "alerts", "(source_identifier)"),
        ]
        for idx_name, table, cols in index_migrations:
            if table in existing_tables:
                try:
                    db.execute(text(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} {cols}"))
                    db.commit()
                except Exception as e:
                    db.rollback()
                    logger.warning(f"Could not ensure index {idx_name}: {e}")
    finally:
        db.close()

# Create database tables first so models are up-to-date natively on fresh databases
Base.metadata.create_all(bind=engine)

# Run legacy schema migrations (adds columns if upgrading older SQLite databases)
run_schema_migrations()

# Seed roles and default admin user
from app.db.seed import seed_database
seed_database()

async def background_sync_loop():
    """Background task loop that executes data sync every 15 minutes"""
    # Wait 10 seconds on boot before starting first sync run
    await asyncio.sleep(10)
    while True:
        try:
            logger.info("â° Background scheduler starting synchronization run...")
            db = SessionLocal()
            try:
                await sync_all_data(db)
            finally:
                db.close()
            logger.info("âœ… Background scheduler synchronization run complete.")
        except Exception as e:
            logger.error(f"âŒ Background scheduler failed: {str(e)}")
        
        # Wait 15 minutes (900 seconds) before running sync again
        await asyncio.sleep(900)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("ðŸš€ Water Crisis Platform Backend Starting...")
    if not settings.DEBUG and not settings.is_jwt_secret_secure:
        logger.critical("SECURITY ADVISORY: Production is running with a default or insecure JWT_SECRET_KEY! Please configure a strong JWT_SECRET_KEY in environment variables.")
    sync_task = asyncio.create_task(background_sync_loop())
    yield
    sync_task.cancel()
    logger.info("ðŸ›‘ Water Crisis Platform Backend Shutting Down...")

# Initialize FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan,
)

# Add CORS middleware with strict origin and credential protection
cors_origins = settings.CORS_ORIGINS
allow_wildcard = "*" in cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=not allow_wildcard,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost",
        "127.0.0.1",
        "testserver",
        "*.onrender.com",
        "*.render.com",
        "*.railway.app",
    ]
)

@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"Unhandled Exception on {request.url.path}: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal Server Error",
                "error_code": "INTERNAL_SERVER_ERROR"
            }
        )

# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """System health check"""
    return {
        "status": "healthy",
        "version": settings.API_VERSION,
        "debug": settings.DEBUG
    }

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(villages.router, prefix="/api/v1/villages", tags=["Villages"])
app.include_router(reservoirs.router, prefix="/api/v1/reservoirs", tags=["Reservoirs"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["Predictions"])
app.include_router(forecasts.router, prefix="/api/v1/forecasts", tags=["Forecasts"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(
    analytics.router,
    prefix="/api/v1/analytics",
    tags=["Analytics"]
)
app.include_router(ai_assistant.router, prefix="/api/v1/ai", tags=["AI Assistant"])
app.include_router(weather.router, prefix="/api/v1/weather", tags=["Live Weather Search"])
app.include_router(websocket.router, prefix="/api/v1")
app.include_router(rivers.router, prefix="/api/v1/rivers", tags=["Rivers"])
app.include_router(evacuation.router, prefix="/api/v1/evacuation", tags=["Evacuation Routing"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin Ingestion"])
app.include_router(flood_intelligence.router, prefix="/api/v1/flood-intelligence", tags=["Flood Intelligence"])

@app.get("/", tags=["System"])
async def root():
    """Welcome endpoint"""
    return {
        "message": "ðŸŒŠ Water Crisis Prediction & Management Platform",
        "version": settings.API_VERSION,
        "docs": "/docs",
        "redoc": "/redoc"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
