import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id"), nullable=False)
    type = Column(String(20), nullable=False)  # reminder, confirmation, alert
    channel = Column(String(10), nullable=False)  # sms, email
    recipient = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(10), default="pending", nullable=False)  # pending, sent, failed
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
