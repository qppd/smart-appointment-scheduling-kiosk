from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import date, datetime
from uuid import UUID

class ResidentCreate(BaseModel):
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    email: Optional[str] = None
    contact_number: str
    birth_date: date
    address: str
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @field_validator("contact_number")
    @classmethod
    def validate_contact(cls, v: str) -> str:
        if len(v) < 10:
            raise ValueError("Invalid contact number")
        return v

class ResidentLogin(BaseModel):
    email: Optional[str] = None
    contact_number: Optional[str] = None
    password: str

class OTPVerify(BaseModel):
    contact_number: str
    otp_code: str

class OTPRequest(BaseModel):
    contact_number: str

class ResidentResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    email: Optional[str] = None
    contact_number: str
    birth_date: date
    address: str
    role: str
    status: str
    fingerprint_template_id: Optional[int] = None
    fingerprint_enrolled: bool = False
    otp_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: ResidentResponse

class ResidentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    email: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None

class ResidentListResponse(BaseModel):
    items: list[ResidentResponse]
    total: int
    page: int
    per_page: int
