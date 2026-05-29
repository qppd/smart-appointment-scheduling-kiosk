import uuid
from datetime import date, datetime, timezone
from sqlalchemy import Column, String, Boolean, Date, DateTime, ForeignKey, Integer, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class ResidentStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"

class ResidentRole(str, enum.Enum):
    RESIDENT = "resident"
    ENCODER = "encoder"
    VERIFIER = "verifier"
    ADMIN = "admin"

class Resident(Base):
    __tablename__ = "residents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    email = Column(String(255), unique=True, nullable=True)
    contact_number = Column(String(20), nullable=False)
    birth_date = Column(Date, nullable=False)
    address = Column(String(500), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(ResidentRole), default=ResidentRole.RESIDENT, nullable=False)
    status = Column(SAEnum(ResidentStatus), default=ResidentStatus.PENDING, nullable=False)
    fingerprint_template_id = Column(Integer, nullable=True)
    fingerprint_enrolled_at = Column(DateTime(timezone=True), nullable=True)
    otp_verified = Column(Boolean, default=False, nullable=False)
    otp_code = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    activated_by = Column(UUID(as_uuid=True), ForeignKey("residents.id"), nullable=True)
    activated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    appointments = relationship("Appointment", back_populates="resident", cascade="all, delete-orphan")
