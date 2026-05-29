from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int = 30
    slot_capacity_per_day: int = 20
    department: Optional[str] = None

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    slot_capacity_per_day: Optional[int] = None
    is_active: Optional[bool] = None
    department: Optional[str] = None

class ServiceResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    duration_minutes: int
    slot_capacity_per_day: int
    is_active: bool
    department: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
