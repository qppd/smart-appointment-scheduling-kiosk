from pydantic import BaseModel
from typing import Optional
from datetime import date, time, datetime
from uuid import UUID

class AppointmentCreate(BaseModel):
    service_id: UUID
    appointment_date: date
    start_time: time

class AppointmentReschedule(BaseModel):
    appointment_date: date
    start_time: time

class AppointmentResponse(BaseModel):
    id: UUID
    resident_id: UUID
    service_id: UUID
    service_name: Optional[str] = None
    appointment_date: date
    start_time: time
    end_time: time
    status: str
    queue_number: Optional[int] = None
    notes: Optional[str] = None
    verified_by_fingerprint: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class AppointmentListResponse(BaseModel):
    items: list[AppointmentResponse]
    total: int

class SlotResponse(BaseModel):
    id: UUID
    start_time: time
    end_time: time
    is_available: bool

    model_config = {"from_attributes": True}
