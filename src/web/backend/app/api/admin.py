from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.resident import Resident
from app.models.appointment import Appointment, AppointmentStatus
from app.models.service import Service
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: Resident = Depends(get_current_admin),
):
    today = date.today()

    # Total residents
    r_result = await db.execute(select(func.count(Resident.id)))
    total_residents = r_result.scalar() or 0

    # Today's appointments
    a_result = await db.execute(
        select(func.count(Appointment.id)).where(Appointment.appointment_date == today)
    )
    today_appointments = a_result.scalar() or 0

    # Checked in today
    c_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.appointment_date == today,
            Appointment.status == AppointmentStatus.CHECKED_IN,
        )
    )
    checked_in = c_result.scalar() or 0

    # Pending activation
    p_result = await db.execute(
        select(func.count(Resident.id)).where(Resident.status == "pending")
    )
    pending_activation = p_result.scalar() or 0

    # Active services
    s_result = await db.execute(
        select(func.count(Service.id)).where(Service.is_active == True)
    )
    active_services = s_result.scalar() or 0

    return {
        "total_residents": total_residents,
        "today_appointments": today_appointments,
        "checked_in_today": checked_in,
        "pending_activation": pending_activation,
        "active_services": active_services,
        "as_of": datetime.now(timezone.utc).isoformat(),
    }

@router.get("/queue")
async def get_queue(
    date_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: Resident = Depends(get_current_admin),
):
    query_date = date.fromisoformat(date_filter) if date_filter else date.today()
    result = await db.execute(
        select(Appointment)
        .where(Appointment.appointment_date == query_date)
        .order_by(Appointment.start_time, Appointment.queue_number)
    )
    appointments = result.scalars().all()

    queue = []
    for apt in appointments:
        svc = await db.get(Service, apt.service_id)
        resident = await db.get(Resident, apt.resident_id)
        queue.append({
            "id": str(apt.id),
            "queue_number": apt.queue_number,
            "resident_name": f"{resident.last_name}, {resident.first_name}" if resident else "Unknown",
            "service_name": svc.name if svc else "Unknown",
            "start_time": apt.start_time.isoformat(),
            "end_time": apt.end_time.isoformat(),
            "status": apt.status if isinstance(apt.status, str) else apt.status.value,
            "verified_by_fingerprint": apt.verified_by_fingerprint,
        })
    return {"date": str(query_date), "items": queue, "total": len(queue)}

@router.patch("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    status: str = Query(...),
    db: AsyncSession = Depends(get_db),
    _: Resident = Depends(get_current_admin),
):
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    apt = result.scalar_one_or_none()
    if not apt:
        return {"error": "Appointment not found"}
    apt.status = status
    await db.flush()
    return {"message": f"Appointment {appointment_id} status updated to {status}"}
