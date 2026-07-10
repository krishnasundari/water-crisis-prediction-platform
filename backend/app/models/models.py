from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Boolean, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from app.db.database import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    GOVERNMENT_OFFICER = "government_officer"

class RiskLevelEnum(str, enum.Enum):
    SAFE = "safe"
    MODERATE = "moderate"
    HIGH = "high"

class AlertSeverityEnum(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

# Role Model
class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    users = relationship("User", back_populates="role")

# User Model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    role = relationship("Role", back_populates="users")
    villages = relationship("Village", back_populates="created_by_user")
    predictions = relationship("Prediction", back_populates="created_by_user")
    alerts = relationship("Alert", back_populates="created_by_user")

# Village Model
class Village(Base):
    __tablename__ = "villages"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    population = Column(Integer)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    water_source = Column(String(100))
    reservoir_dependency = Column(Float)  # Percentage
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    created_by_user = relationship("User", back_populates="villages")
    groundwater_records = relationship("GroundwaterRecord", back_populates="village")
    predictions = relationship("Prediction", back_populates="village")

# Reservoir Model
class Reservoir(Base):
    __tablename__ = "reservoirs"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, index=True)
    capacity = Column(Float, nullable=False)  # Million cubic meters
    current_level = Column(Float, nullable=False)
    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    rainfall_records = relationship("RainfallRecord", back_populates="reservoir")
    forecasts = relationship("Forecast", back_populates="reservoir")

# Rainfall Record Model
class RainfallRecord(Base):
    __tablename__ = "rainfall_records"
    
    id = Column(Integer, primary_key=True)
    reservoir_id = Column(Integer, ForeignKey("reservoirs.id"), nullable=False)
    district = Column(String(100), nullable=False, index=True)
    measurement_date = Column(DateTime, nullable=False, index=True)
    rainfall_amount = Column(Float, nullable=False)  # mm
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    reservoir = relationship("Reservoir", back_populates="rainfall_records")

# Groundwater Record Model
class GroundwaterRecord(Base):
    __tablename__ = "groundwater_records"
    
    id = Column(Integer, primary_key=True)
    village_id = Column(Integer, ForeignKey("villages.id"), nullable=False)
    measurement_date = Column(DateTime, nullable=False, index=True)
    depth = Column(Float, nullable=False)  # meters below surface
    status = Column(String(50), default="stable")  # stable, improving, declining
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    village = relationship("Village", back_populates="groundwater_records")

# Prediction Model
class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True)
    village_id = Column(Integer, ForeignKey("villages.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    risk_score = Column(Float, nullable=False)  # 0-100
    risk_level = Column(String(20), nullable=False)  # safe, moderate, high
    rainfall = Column(Float)
    population = Column(Integer)
    reservoir_capacity = Column(Float)
    groundwater_level = Column(Float)
    flood_probability = Column(Float)
    flood_severity = Column(String(30))
    confidence_score = Column(Float)
    expected_impact = Column(String(500))
    prediction_date = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    village = relationship("Village", back_populates="predictions")
    created_by_user = relationship("User", back_populates="predictions")

# Forecast Model
class Forecast(Base):
    __tablename__ = "forecasts"
    
    id = Column(Integer, primary_key=True)
    reservoir_id = Column(Integer, ForeignKey("reservoirs.id"), nullable=False)
    forecast_date = Column(DateTime, nullable=False)  # Start of forecast period
    horizon_days = Column(Integer, nullable=False)  # 30, 60, or 90
    predicted_capacity = Column(Float, nullable=False)
    upper_bound = Column(Float)  # Confidence interval upper
    lower_bound = Column(Float)  # Confidence interval lower
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    reservoir = relationship("Reservoir", back_populates="forecasts")

# Alert Model
class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True)
    village_id = Column(Integer, ForeignKey("villages.id"))
    reservoir_id = Column(Integer, ForeignKey("reservoirs.id"))
    alert_type = Column(String(50), nullable=False)  # risk, reservoir, groundwater
    severity = Column(String(20), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    created_by_user = relationship("User", back_populates="alerts")

# Report Model
class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    report_type = Column(String(20), nullable=False)  # pdf, excel
    file_path = Column(String(500))
    generated_by = Column(Integer, ForeignKey("users.id"))
    filters = Column(Text)  # JSON string of filters used
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# AI Conversation Model
class AIConversation(Base):
    __tablename__ = "ai_conversations"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user_message = Column(Text, nullable=False)
    assistant_response = Column(Text, nullable=False)
    context = Column(Text)  # JSON string of context data
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# Password Reset OTP Model
class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otps"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), index=True, nullable=False)
    otp_code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# Weather History Model
class WeatherHistory(Base):
    __tablename__ = "weather_history"
    
    id = Column(Integer, primary_key=True)
    location_name = Column(String(255), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    temperature = Column(Float)
    humidity = Column(Float)
    pressure = Column(Float)
    rainfall = Column(Float)
    wind_speed = Column(Float)
    cloud_cover = Column(Float)
    visibility = Column(Float)
    condition = Column(String(100))
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

# Reservoir History Model
class ReservoirHistory(Base):
    __tablename__ = "reservoir_history"
    
    id = Column(Integer, primary_key=True)
    reservoir_id = Column(Integer, ForeignKey("reservoirs.id"), nullable=False)
    water_level = Column(Float, nullable=False)
    inflow = Column(Float)
    outflow = Column(Float)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    reservoir = relationship("Reservoir")

# River Model
class River(Base):
    __tablename__ = "rivers"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    river_level = Column(Float, nullable=False) # Current level in meters
    danger_level = Column(Float, nullable=False) # Danger level in meters
    flow_rate = Column(Float, nullable=False) # Flow rate in m3/s
    trend = Column(String(20), default="Steady") # "Rising", "Falling", "Steady"
    latitude = Column(Float)
    longitude = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# River History Model
class RiverHistory(Base):
    __tablename__ = "river_history"
    
    id = Column(Integer, primary_key=True)
    river_id = Column(Integer, ForeignKey("rivers.id"), nullable=False)
    river_level = Column(Float, nullable=False)
    flow_rate = Column(Float, nullable=False)
    trend = Column(String(20), nullable=False)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    river = relationship("River")
