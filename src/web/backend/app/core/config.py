from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Appointment Scheduling Kiosk"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/barangay_kiosk"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None

    # JWT
    SECRET_KEY: str = "change-this-to-a-secure-random-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # OTP
    OTP_EXPIRE_MINUTES: int = 10
    USE_SUPABASE_OTP: bool = True

    # Semaphore SMS (PH provider)
    SEMAPHORE_API_KEY: Optional[str] = None
    SEMAPHORE_SENDER_NAME: str = "BARANGAY"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000", "https://*.vercel.app"]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
