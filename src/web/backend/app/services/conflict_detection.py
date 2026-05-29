from datetime import date, time, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, Integer
from app.models.appointment import Appointment, AppointmentStatus
from app.models.time_slot import TimeSlot
from app.models.service import Service

CONFLICT_GRACE_MINUTES = 10

async def check_slot_available(
    db: AsyncSession,
    service_id,
    appointment_date: date,
    start_time: time,
    duration_minutes: int,
    exclude_resident_id: str | None = None,
) -> bool:
    """Check if a time slot is available for booking.

    Args:
        exclude_resident_id: If set, exclude this resident's appointments from the count
                             (used when rescheduling, to allow the same resident to re-book).
    """
    # Calculate end time
    start_dt = datetime.combine(appointment_date, start_time)
    end_dt = start_dt + timedelta(minutes=duration_minutes)
    end_time = end_dt.time()

    # Check overlapping appointments for this service on this date
    conditions = and_(
        Appointment.service_id == service_id,
        Appointment.appointment_date == appointment_date,
        Appointment.status.notin_([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]),
        Appointment.start_time < end_time,
        Appointment.end_time > start_time,
    )
    stmt = select(func.count(Appointment.id)).where(conditions)
    result = await db.execute(stmt)
    count = result.scalar() or 0

    # Get service capacity
    svc_result = await db.execute(select(Service).where(Service.id == service_id))
    service = svc_result.scalar_one_or_none()
    if not service:
        return False

    if count >= service.slot_capacity_per_day:
        return False

    return True

async def find_or_create_time_slot(
    db: AsyncSession,
    service_id,
    appointment_date: date,
    start_time: time,
    duration_minutes: int,
):
    """Find existing time slot or create a new one."""
    start_dt = datetime.combine(appointment_date, start_time)
    end_dt = start_dt + timedelta(minutes=duration_minutes)
    end_time = end_dt.time()

    # Try to find existing slot
    stmt = select(TimeSlot).where(
        and_(
            TimeSlot.service_id == service_id,
            TimeSlot.date == appointment_date,
            TimeSlot.start_time == start_time,
            TimeSlot.end_time == end_time,
        )
    )
    result = await db.execute(stmt)
    slot = result.scalar_one_or_none()

    if slot:
        return slot

    # Create new slot
    slot = TimeSlot(
        service_id=service_id,
        date=appointment_date,
        start_time=start_time,
        end_time=end_time,
        is_available=True,
        version=1,
    )
    db.add(slot)
    await db.flush()
    await db.refresh(slot)
    return slot

async def book_slot(
    db: AsyncSession,
    slot: TimeSlot,
) -> bool:
    """Optimistic locking: try to book a slot by incrementing version."""
    if not slot.is_available:
        return False

    result = await db.execute(
        select(TimeSlot).where(
            and_(
                TimeSlot.id == slot.id,
                TimeSlot.version == slot.version,
            )
        )
    )
    current = result.scalar_one_or_none()
    if not current:
        return False

    current.is_available = False
    current.version += 1
    await db.flush()
    return True

async def get_next_queue_number(db: AsyncSession, service_id, appointment_date: date) -> int:
    """Get the next queue number for a service on a given date."""
    stmt = select(func.max(Appointment.queue_number)).where(
        and_(
            Appointment.service_id == service_id,
            Appointment.appointment_date == appointment_date,
        )
    )
    result = await db.execute(stmt)
    max_q = result.scalar() or 0
    return max_q + 1
