from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime
from typing import Optional, List
import enum

class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    GOVERNMENT_OFFICER = "government_officer"

# ============ User Schemas ============

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=255)
    role: RoleEnum

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class UserResponse(UserBase):
    id: int
    role: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ============ Authentication Schemas ============

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenRefresh(BaseModel):
    refresh_token: str

# ============ Village Schemas ============

class VillageBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    district: str
    state: str
    population: Optional[int] = None
    latitude: float
    longitude: float
    water_source: Optional[str] = None
    reservoir_dependency: Optional[float] = Field(None, ge=0, le=100)

class VillageCreate(VillageBase):
    pass

class VillageUpdate(BaseModel):
    name: Optional[str] = None
    population: Optional[int] = None
    water_source: Optional[str] = None
    reservoir_dependency: Optional[float] = None

class VillageResponse(VillageBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class VillageListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[VillageResponse]

# ============ Reservoir Schemas ============

class ReservoirBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    capacity: float = Field(..., gt=0)
    current_level: float = Field(..., ge=0)
    district: str
    state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ReservoirCreate(ReservoirBase):
    pass

class ReservoirUpdate(BaseModel):
    current_level: Optional[float] = None
    name: Optional[str] = None

class ReservoirResponse(ReservoirBase):
    id: int
    created_at: datetime
    updated_at: datetime
    utilization_percentage: Optional[float] = None
    
    class Config:
        from_attributes = True

# ============ Rainfall Record Schemas ============

class RainfallRecordCreate(BaseModel):
    reservoir_id: int
    district: str
    measurement_date: datetime
    rainfall_amount: float = Field(..., ge=0)

class RainfallRecordResponse(BaseModel):
    id: int
    reservoir_id: int
    district: str
    measurement_date: datetime
    rainfall_amount: float
    created_at: datetime
    
    class Config:
        from_attributes = True

# ============ Groundwater Record Schemas ============

class GroundwaterRecordCreate(BaseModel):
    village_id: int
    measurement_date: datetime
    depth: float = Field(..., ge=0)

class GroundwaterRecordResponse(BaseModel):
    id: int
    village_id: int
    measurement_date: datetime
    depth: float
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# ============ Prediction Schemas ============

class PredictionRequest(BaseModel):
    village_id: int
    rainfall: Optional[float] = None
    population: Optional[int] = None
    reservoir_capacity: Optional[float] = None
    groundwater_level: Optional[float] = None

class PredictionResponse(BaseModel):
    id: int
    village_id: int
    risk_score: float
    risk_level: str  # safe, moderate, high
    prediction_date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

class PredictionStatsResponse(BaseModel):
    total_predictions: int
    safe_count: int
    moderate_count: int
    high_count: int
    average_risk_score: float
    last_prediction_date: datetime

# ============ Forecast Schemas ============

class ForecastResponse(BaseModel):
    id: int
    reservoir_id: int
    forecast_date: datetime
    horizon_days: int
    predicted_capacity: float
    upper_bound: Optional[float]
    lower_bound: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ForecastListResponse(BaseModel):
    reservoir_id: int
    forecast_30d: Optional[ForecastResponse]
    forecast_60d: Optional[ForecastResponse]
    forecast_90d: Optional[ForecastResponse]

# ============ Alert Schemas ============
class AlertCreate(BaseModel):
    village_id: Optional[int] = None
    reservoir_id: Optional[int] = None
    alert_type: str
    severity: str
    message: str

class AlertResponse(BaseModel):
    id: int
    village_id: Optional[int]
    reservoir_id: Optional[int]
    alert_type: str
    severity: str  # low, medium, high, critical
    message: str
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class AlertListResponse(BaseModel):
    total: int
    unread: int
    items: List[AlertResponse]

# ============ Report Schemas ============

class ReportGenerateRequest(BaseModel):
    report_type: str  # pdf, excel
    filters: Optional[dict] = None
    include_predictions: bool = True
    include_forecasts: bool = True

class ReportResponse(BaseModel):
    id: int
    title: str
    report_type: str
    file_path: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# ============ AI Assistant Schemas ============

class AIMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    context: Optional[dict] = None

class AIMessageResponse(BaseModel):
    user_message: str
    assistant_response: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class AIConversationResponse(BaseModel):
    total_messages: int
    messages: List[AIMessageResponse]

# ============ Dashboard Schemas ============

class DashboardStatsResponse(BaseModel):
    total_villages: int
    total_reservoirs: int
    high_risk_villages: int
    active_alerts: int
    average_risk_score: float
    latest_forecast_date: Optional[datetime]

class DashboardChartDataResponse(BaseModel):
    labels: List[str]
    data: List[float]
    title: str

# ============ Pagination ============

class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)

# ============ Error Response ============

class ErrorResponse(BaseModel):
    detail: str
    status_code: int
    timestamp: datetime
class GoogleLoginRequest(BaseModel):
    credential: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp_code: str
    new_password: str