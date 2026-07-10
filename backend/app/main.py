from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.db.database import engine, Base, SessionLocal
from app.api.routes import auth, villages, reservoirs, predictions, forecasts, alerts, reports, dashboard, ai_assistant, analytics, weather, websocket, rivers
import asyncio
from app.services.sync_service import sync_all_data

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# Seed roles and default admin user
from app.db.seed import seed_database
seed_database()

async def background_sync_loop():
    """Background task loop that executes data sync every 15 minutes"""
    # Wait 10 seconds on boot before starting first sync run
    await asyncio.sleep(10)
    while True:
        try:
            logger.info("⏰ Background scheduler starting synchronization run...")
            db = SessionLocal()
            try:
                await sync_all_data(db)
            finally:
                db.close()
            logger.info("✅ Background scheduler synchronization run complete.")
        except Exception as e:
            logger.error(f"❌ Background scheduler failed: {str(e)}")
        
        # Wait 15 minutes (900 seconds) before running sync again
        await asyncio.sleep(900)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("🚀 Water Crisis Platform Backend Starting...")
    sync_task = asyncio.create_task(background_sync_loop())
    yield
    sync_task.cancel()
    logger.info("🛑 Water Crisis Platform Backend Shutting Down...")

# Initialize FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
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

@app.get("/", tags=["System"])
async def root():
    """Welcome endpoint"""
    return {
        "message": "🌊 Water Crisis Prediction & Management Platform",
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
