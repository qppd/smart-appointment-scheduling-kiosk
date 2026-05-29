import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.resident import Resident, ResidentStatus, ResidentRole
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from uuid import UUID
import httpx

async def register_resident(db: AsyncSession, data: dict) -> Resident:
    resident = Resident(
        first_name=data["first_name"],
        last_name=data["last_name"],
        middle_name=data.get("middle_name"),
        email=data.get("email"),
        contact_number=data["contact_number"],
        birth_date=data["birth_date"],
        address=data["address"],
        password_hash=get_password_hash(data["password"]),
        status=ResidentStatus.PENDING,
        role=ResidentRole.RESIDENT,
    )
    db.add(resident)
    await db.flush()
    await db.refresh(resident)
    return resident

async def authenticate_resident(db: AsyncSession, email: Optional[str], contact: Optional[str], password: str) -> Optional[Resident]:
    if email:
        result = await db.execute(select(Resident).where(Resident.email == email))
    elif contact:
        result = await db.execute(select(Resident).where(Resident.contact_number == contact))
    else:
        return None
    resident = result.scalar_one_or_none()
    if not resident or not verify_password(password, resident.password_hash):
        return None
    return resident

def generate_otp() -> str:
    return f"{random.randint(100000, 999999)}"

async def send_otp_sms(contact_number: str, otp: str) -> bool:
    """Send OTP via Semaphore SMS API. Returns True if sent."""
    if not settings.SEMAPHORE_API_KEY:
        return False
    url = "https://api.semaphore.co/api/v4/messages"
    payload = {
        "apikey": settings.SEMAPHORE_API_KEY,
        "number": contact_number,
        "message": f"Your Barangay Dolores OTP code is: {otp}. Valid for {settings.OTP_EXPIRE_MINUTES} minutes.",
        "sendername": settings.SEMAPHORE_SENDER_NAME,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, data=payload)
        return resp.status_code == 200

async def request_otp(db: AsyncSession, contact_number: str) -> bool:
    result = await db.execute(select(Resident).where(Resident.contact_number == contact_number))
    resident = result.scalar_one_or_none()
    if not resident:
        return False
    otp = generate_otp()
    resident.otp_code = otp
    resident.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    await db.flush()
    sent = await send_otp_sms(contact_number, otp)
    return sent

async def verify_otp(db: AsyncSession, contact_number: str, otp: str) -> bool:
    result = await db.execute(select(Resident).where(Resident.contact_number == contact_number))
    resident = result.scalar_one_or_none()
    if not resident or resident.otp_code != otp:
        return False
    if not resident.otp_expires_at or datetime.now(timezone.utc) > resident.otp_expires_at:
        return False
    resident.otp_verified = True
    resident.otp_code = None
    resident.otp_expires_at = None
    await db.flush()
    return True

async def activate_resident(db: AsyncSession, resident_id: UUID, admin_id: UUID) -> bool:
    result = await db.execute(select(Resident).where(Resident.id == resident_id))
    resident = result.scalar_one_or_none()
    if not resident:
        return False
    resident.status = ResidentStatus.ACTIVE
    resident.activated_by = admin_id
    resident.activated_at = datetime.now(timezone.utc)
    await db.flush()
    return True
