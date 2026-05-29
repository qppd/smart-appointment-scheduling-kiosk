from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.appointment import AppointmentCreate, AppointmentReschedule, AppointmentResponse, AppointmentListResponse, SlotResponse
from app.models.appointment import Appointment, AppointmentStatus
from app.models.service import Service
from app.models.resident import Resident, ResidentStatus
from app.services.conflict_detection import check_slot_available, find_or_create_time_slot, book_slot, get_next_queue_number
from datetime import date, time, datetime, timedelta
import uuid

router = APIRouter(prefix="/appointments", tags=["Appointments"])

async def verify_user_can_book(resident: Resident):
    if resident.status != ResidentStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account not activated. Please visit the barangay hall to activate your account.")
    if not resident.fingerprint_template_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Fingerprint not enrolled. Please visit the kiosk to enroll your fingerprint.")

@router.get("/slots", response_model=list[SlotResponse])
async def get_available_slots(
    service_id: str,
    appointment_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    _: Resident = Depends(get_current_user),
):
    # Get service duration
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Generate time slots (8AM to 5PM, 30-min intervals by default)
    duration = service.duration_minutes
    slots = []
    base_time = datetime.combine(appointment_date, time(8, 0))
    end_boundary = datetime.combine(appointment_date, time(17, 0))

    while base_time + timedelta(minutes=duration) <= end_boundary:
        start = base_time.time()
        end = (base_time + timedelta(minutes=duration)).time()
        available = await check_slot_available(db, service_id, appointment_date, start, duration)
        slot_id = uuid.uuid4()
        slots.append(SlotResponse(id=slot_id, start_time=start, end_time=end, is_available=available))
        base_time += timedelta(minutes=duration)

    return slots

@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Resident = Depends(get_current_user),
):
    await verify_user_can_book(current_user)

    # Get service
    result = await db.execute(select(Service).where(Service.id == data.service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Check availability
    available = await check_slot_available(db, data.service_id, data.appointment_date, data.start_time, service.duration_minutes)
    if not available:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Time slot is no longer available")

    # Find or create time slot
    slot = await find_or_create_time_slot(db, data.service_id, data.appointment_date, data.start_time, service.duration_minutes)

    # Book with optimistic locking
    booked = await book_slot(db, slot)
    if not booked:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot was just taken. Please try another time.")

    # Calculate end time
    start_dt = datetime.combine(data.appointment_date, data.start_time)
    end_dt = start_dt + timedelta(minutes=service.duration_minutes)

    # Get queue number
    qnum = await get_next_queue_number(db, data.service_id, data.appointment_date)

    appointment = Appointment(
        resident_id=current_user.id,
        service_id=data.service_id,
        appointment_date=data.appointment_date,
        start_time=data.start_time,
        end_time=end_dt.time(),
        status=AppointmentStatus.SCHEDULED,
        queue_number=qnum,
    )
    db.add(appointment)
    await db.flush()
    await db.refresh(appointment)

    return AppointmentResponse(
        id=appointment.id,
        resident_id=appointment.resident_id,
        service_id=appointment.service_id,
        service_name=service.name,
        appointment_date=appointment.appointment_date,
        start_time=appointment.start_time,
        end_time=appointment.end_time,
        status=appointment.status.value,
        queue_number=appointment.queue_number,
        notes=appointment.notes,
        verified_by_fingerprint=appointment.verified_by_fingerprint,
        created_at=appointment.created_at,
    )

@router.get("/my", response_model=AppointmentListResponse)
async def get_my_appointments(
    status_filter: str = Query(""),
    db: AsyncSession = Depends(get_db),
    current_user: Resident = Depends(get_current_user),
):
    query = select(Appointment).where(Appointment.resident_id == current_user.id)
    if status_filter:
        query = query.where(Appointment.status == status_filter)
    query = query.order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())
    result = await db.execute(query)
    appointments = result.scalars().all()

    items = []
    for apt in appointments:
        svc = await db.get(Service, apt.service_id)
        items.append(AppointmentResponse(
            id=apt.id,
            resident_id=apt.resident_id,
            service_id=apt.service_id,
            service_name=svc.name if svc else None,
            appointment_date=apt.appointment_date,
            start_time=apt.start_time,
            end_time=apt.end_time,
            status=apt.status if isinstance(apt.status, str) else apt.status.value,
            queue_number=apt.queue_number,
            notes=apt.notes,
            verified_by_fingerprint=apt.verified_by_fingerprint,
            created_at=apt.created_at,
        ))

    return AppointmentListResponse(items=items, total=len(items))

@router.get("/today", response_model=list[AppointmentResponse])
async def get_today_appointments(
    db: AsyncSession = Depends(get_db),
    _: Resident = Depends(get_current_user),
):
    today = date.today()
    query = select(Appointment).where(Appointment.appointment_date == today).order_by(Appointment.start_time)
    result = await db.execute(query)
    appointments = result.scalars().all()

    items = []
    for apt in appointments:
        svc = await db.get(Service, apt.service_id)
        items.append(AppointmentResponse(
            id=apt.id,
            resident_id=apt.resident_id,
            service_id=apt.service_id,
            service_name=svc.name if svc else None,
            appointment_date=apt.appointment_date,
            start_time=apt.start_time,
            end_time=apt.end_time,
            status=apt.status if isinstance(apt.status, str) else apt.status.value,
            queue_number=apt.queue_number,
            notes=apt.notes,
            verified_by_fingerprint=apt.verified_by_fingerprint,
            created_at=apt.created_at,
        ))

    return items

@router.patch("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Resident = Depends(get_current_user),
):
    result = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.id == appointment_id,
                Appointment.resident_id == current_user.id,
            )
        )
    )
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if apt.status not in (AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED):
        raise HTTPException(status_code=400, detail="Cannot cancel this appointment")
    apt.status = AppointmentStatus.CANCELLED
    await db.flush()
    return {"message": "Appointment cancelled"}

@router.patch("/{appointment_id}/reschedule", response_model=AppointmentResponse)
async def reschedule_appointment(
    appointment_id: str,
    data: AppointmentReschedule,
    db: AsyncSession = Depends(get_db),
    current_user: Resident = Depends(get_current_user),
):
    result = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.id == appointment_id,
                Appointment.resident_id == current_user.id,
            )
        )
    )
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Get service
    svc = await db.get(Service, apt.service_id)
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    # Check slot availability
    available = await check_slot_available(db, svc.id, data.appointment_date, data.start_time, svc.duration_minutes)
    if not available:
        raise HTTPException(status_code=409, detail="Time slot not available")

    start_dt = datetime.combine(data.appointment_date, data.start_time)
    end_dt = start_dt + timedelta(minutes=svc.duration_minutes)

    apt.appointment_date = data.appointment_date
    apt.start_time = data.start_time
    apt.end_time = end_dt.time()
    apt.status = AppointmentStatus.SCHEDULED
    await db.flush()
    await db.refresh(apt)

    return AppointmentResponse(
        id=apt.id,
        resident_id=apt.resident_id,
        service_id=apt.service_id,
        service_name=svc.name,
        appointment_date=apt.appointment_date,
        start_time=apt.start_time,
        end_time=apt.end_time,
        status=apt.status if isinstance(apt.status, str) else apt.status.value,
        queue_number=apt.queue_number,
        notes=apt.notes,
        verified_by_fingerprint=apt.verified_by_fingerprint,
        created_at=apt.created_at,
    )
