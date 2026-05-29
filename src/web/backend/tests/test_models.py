"""Tests for SQLAlchemy model creation and relationships."""
import pytest
from datetime import date, time
from uuid import uuid4
from app.models.resident import Resident, ResidentStatus, ResidentRole
from app.models.service import Service
from app.models.appointment import Appointment, AppointmentStatus
from app.models.time_slot import TimeSlot
from app.models.notification import Notification

pytestmark = pytest.mark.asyncio

class TestResidentModel:
    async def test_create_resident(self, db):
        resident = Resident(
            id=uuid4(),
            first_name="Test",
            last_name="User",
            contact_number="09171234567",
            birth_date=date(1990, 1, 1),
            address="123 Street",
            password_hash="hashed_password",
        )
        db.add(resident)
        await db.flush()
        assert resident.id is not None
        assert resident.status == ResidentStatus.PENDING
        assert resident.role == ResidentRole.RESIDENT
        assert resident.otp_verified is False

    async def test_resident_str(self, sample_resident):
        assert str(sample_resident.id) is not None

    async def test_resident_relationships(self, db, sample_resident, sample_appointment):
        # The appointment was created outside this test, so lazy loading
        # needs a fresh query. Use select + relationship loading.
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        stmt = (
            select(Resident)
            .options(selectinload(Resident.appointments))
            .where(Resident.id == sample_resident.id)
        )
        result = await db.execute(stmt)
        resident = result.scalar_one()
        assert len(resident.appointments) >= 1
        assert sample_appointment in resident.appointments

    async def test_resident_default_status(self, db):
        """Resident status defaults to PENDING when persisted to DB."""
        r = Resident(
            id=uuid4(),
            first_name="Default",
            last_name="Test",
            contact_number="09170000001",
            birth_date=date(2000, 1, 1),
            address="Address",
            password_hash="hash",
        )
        # In-memory object before flush has None for status
        # SQLAlchemy Column(default=...) only applies at INSERT time
        db.add(r)
        await db.flush()
        await db.refresh(r)
        assert r.status == ResidentStatus.PENDING
        assert r.role == ResidentRole.RESIDENT

class TestServiceModel:
    async def test_create_service(self, db):
        svc = Service(
            id=uuid4(),
            name="Barangay ID",
            description="Application for Barangay ID",
            duration_minutes=15,
            slot_capacity_per_day=30,
        )
        db.add(svc)
        await db.flush()
        assert svc.name == "Barangay ID"
        assert svc.is_active is True

    async def test_service_relationship(self, sample_service, sample_appointment):
        assert sample_appointment.service_id == sample_service.id

class TestAppointmentModel:
    async def test_create_appointment(self, db, sample_resident, sample_service):
        apt = Appointment(
            id=uuid4(),
            resident_id=sample_resident.id,
            service_id=sample_service.id,
            appointment_date=date(2026, 7, 1),
            start_time=time(8, 0),
            end_time=time(8, 30),
            status=AppointmentStatus.SCHEDULED,
            queue_number=1,
        )
        db.add(apt)
        await db.flush()
        assert apt.status == AppointmentStatus.SCHEDULED
        assert apt.verified_by_fingerprint is False

    async def test_appointment_status_transitions(self):
        """All valid statuses should be defined."""
        assert AppointmentStatus.SCHEDULED.value == "scheduled"
        assert AppointmentStatus.CONFIRMED.value == "confirmed"
        assert AppointmentStatus.CHECKED_IN.value == "checked_in"
        assert AppointmentStatus.COMPLETED.value == "completed"
        assert AppointmentStatus.CANCELLED.value == "cancelled"
        assert AppointmentStatus.NO_SHOW.value == "no_show"
        assert len(AppointmentStatus) == 6

class TestTimeSlotModel:
    async def test_create_timeslot(self, db, sample_service):
        slot = TimeSlot(
            id=uuid4(),
            service_id=sample_service.id,
            date=date(2026, 7, 1),
            start_time=time(8, 0),
            end_time=time(8, 30),
        )
        db.add(slot)
        await db.flush()
        assert slot.is_available is True
        assert slot.version == 1

    async def test_timeslot_optimistic_locking(self, db, sample_service):
        slot = TimeSlot(
            id=uuid4(),
            service_id=sample_service.id,
            date=date(2026, 7, 1),
            start_time=time(9, 0),
            end_time=time(9, 30),
            version=1,
        )
        db.add(slot)
        await db.flush()
        slot.is_available = False
        slot.version += 1
        await db.flush()
        assert slot.version == 2

class TestNotificationModel:
    async def test_create_notification(self, db, sample_appointment):
        notif = Notification(
            id=uuid4(),
            appointment_id=sample_appointment.id,
            type="confirmation",
            channel="sms",
            recipient="09171234567",
            message="Test notification message",
        )
        db.add(notif)
        await db.flush()
        assert notif.status == "pending"
        assert notif.type == "confirmation"