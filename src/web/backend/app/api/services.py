from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceResponse
from app.models.service import Service
from app.models.resident import Resident

router = APIRouter(prefix="/services", tags=["Services"])

@router.get("/", response_model=list[ServiceResponse])
async def list_services(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    _: Resident = Depends(get_current_user),
):
    query = select(Service)
    if not include_inactive:
        query = query.where(Service.is_active == True)
    query = query.order_by(Service.name)
    result = await db.execute(query)
    services = result.scalars().all()
    return services

@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: str,
    db: AsyncSession = Depends(get_db),
    _: Resident = Depends(get_current_user),
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return service

@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    data: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    _: Resident = Depends(get_current_admin),
):
    service = Service(**data.model_dump())
    db.add(service)
    await db.flush()
    await db.refresh(service)
    return service

@router.patch("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str,
    data: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    _: Resident = Depends(get_current_admin),
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(service, key, value)
    await db.flush()
    await db.refresh(service)
    return service

@router.delete("/{service_id}")
async def delete_service(
    service_id: str,
    db: AsyncSession = Depends(get_db),
    _: Resident = Depends(get_current_admin),
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    service.is_active = False
    await db.flush()
    return {"message": "Service deactivated"}
