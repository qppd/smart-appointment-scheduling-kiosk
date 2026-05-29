from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.resident import (
    ResidentCreate, ResidentLogin, OTPVerify, OTPRequest,
    TokenResponse, ResidentResponse
)
from app.services.auth_service import (
    register_resident, authenticate_resident,
    request_otp as svc_request_otp,
    verify_otp as svc_verify_otp
)
from app.core.security import create_access_token
from app.models.resident import Resident

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=ResidentResponse, status_code=status.HTTP_201_CREATED)
async def register(data: ResidentCreate, db: AsyncSession = Depends(get_db)):
    resident = await register_resident(db, data.model_dump())
    return resident

@router.post("/login", response_model=TokenResponse)
async def login(data: ResidentLogin, db: AsyncSession = Depends(get_db)):
    resident = await authenticate_resident(
        db, data.email, data.contact_number, data.password
    )
    if not resident:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": str(resident.id), "role": resident.role.value})
    return TokenResponse(
        access_token=token,
        user=ResidentResponse(
            id=resident.id,
            first_name=resident.first_name,
            last_name=resident.last_name,
            middle_name=resident.middle_name,
            email=resident.email,
            contact_number=resident.contact_number,
            birth_date=resident.birth_date,
            address=resident.address,
            role=resident.role.value,
            status=resident.status.value,
            fingerprint_template_id=resident.fingerprint_template_id,
            fingerprint_enrolled=resident.fingerprint_template_id is not None,
            otp_verified=resident.otp_verified,
            created_at=resident.created_at,
        )
    )

@router.post("/request-otp")
async def request_otp_endpoint(data: OTPRequest, db: AsyncSession = Depends(get_db)):
    sent = await svc_request_otp(db, data.contact_number)
    if not sent:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to send OTP")
    return {"message": "OTP sent successfully"}

@router.post("/verify-otp")
async def verify_otp_endpoint(data: OTPVerify, db: AsyncSession = Depends(get_db)):
    verified = await svc_verify_otp(db, data.contact_number, data.otp_code)
    if not verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")
    return {"message": "OTP verified successfully"}

@router.get("/me", response_model=ResidentResponse)
async def get_me(current_user: Resident = Depends(get_current_user)):
    return ResidentResponse(
        id=current_user.id,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        middle_name=current_user.middle_name,
        email=current_user.email,
        contact_number=current_user.contact_number,
        birth_date=current_user.birth_date,
        address=current_user.address,
        role=current_user.role.value,
        status=current_user.status.value,
        fingerprint_template_id=current_user.fingerprint_template_id,
        fingerprint_enrolled=current_user.fingerprint_template_id is not None,
        otp_verified=current_user.otp_verified,
        created_at=current_user.created_at,
    )
