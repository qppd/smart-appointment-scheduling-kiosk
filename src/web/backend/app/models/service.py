import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Service(Base):
    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=30)
    slot_capacity_per_day = Column(Integer, nullable=False, default=20)
    is_active = Column(Boolean, default=True, nullable=False)
    department = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    appointments = relationship("Appointment", back_populates="service", cascade="all, delete-orphan")
    time_slots = relationship("TimeSlot", back_populates="service", cascade="all, delete-orphan")
