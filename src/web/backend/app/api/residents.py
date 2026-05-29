from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.schemas.resident import ResidentResponse, ResidentListResponse, ResidentUpdate
from app.models.resident import Resident, ResidentStatus

router = APIRouter(prefix="/residents", tags=["Residents"])

@router.get("/", response_model=ResidentListResponse)
async def list_residents(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    status_filter: str = Query(""),
    db: AsyncSession = Depends(get_db),
    _: Resident = Depends(get_current_admin),
):
    query = select(Resident)
    count_query = select(func.count(Resident.id))

    if search:
        search_filter = (
            Resident.first_name.ilike(f"%{search}%")
            | Resident.last_name.ilike(f"%{search}%")
            | Resident.contact_number.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if status_filter:
        query = query.where(Resident.status == status_filter)
        count_query = count_query.where(Resident.status == status_filter)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Resident.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    residents = result.scalars().all()

    return ResidentListResponse(
        items=[ResidentResponse(
            id=r.id,
            first_name=r.first_name,
            last_name=r.last_name,
            middle_name=r.middle_name,
            email=r.email,
            contact_number=r.contact_number,
            birth_date=r.birth_date,
            address=r.address,
            role=r.role.value,
            status=r.status.value,
            fingerprint_template_id=r.fingerprint_template_id,
            fingerprint_enrolled=r.fingerprint_template_id is not None,
            otp_verified=r.otp_verified,
            created_at=r.created_at,
        ) for r in residents],
        total=total,
        page=page,
        per_page=per_page,
    )

@router.get("/{resident_id}", response_model=ResidentResponse)
async def get_resident(
    resident_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Resident = Depends(get_current_user),
):
    if str(current_user.id) != resident_id and current_user.role.value not in ("admin", "encoder", "verifier"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    from sqlalchemy import select
    result = await db.execute(select(Resident).where(Resident.id == resident_id))
    resident = result.scalar_one_or_none()
    if not resident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resident not found")
    return ResidentResponse(
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

@router.patch("/{resident_id}/activate")
async def activate_resident(
    resident_id: str,
    db: AsyncSession = Depends(get_db),
    admin: Resident = Depends(get_current_admin),
):
    from app.services.auth_service import activate_resident as do_activate
    success = await do_activate(db, resident_id, admin.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resident not found")
    return {"message": "Resident activated successfully"}

@router.patch("/{resident_id}", response_model=ResidentResponse)
async def update_resident(
    resident_id: str,
    data: ResidentUpdate,
    db: AsyncSession = Depends(get_db),
    _: Resident = Depends(get_current_admin),
):
    from sqlalchemy import select
    result = await db.execute(select(Resident).where(Resident.id == resident_id))
    resident = result.scalar_one_or_none()
    if not resident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resident not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(resident, key):
            setattr(resident, key, value)
    await db.flush()
    await db.refresh(resident)
    return ResidentResponse(
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
