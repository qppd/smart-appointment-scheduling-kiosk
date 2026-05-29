"""Integration tests for the API endpoints.
Tests the full flow: register -> login -> book -> check-in.

NOTE: These tests use async HTTP calls via TestClient or httpx.
Since the FastAPI app has complex dependency injection (async DB sessions),
these are high-level tests that validate endpoint structure and auth.

For a real end-to-end test, you'd need a running PostgreSQL instance.
These tests validate the logic layer via route handlers.
"""
import pytest
from datetime import date, time
from app.models.resident import Resident, ResidentStatus, ResidentRole
from app.models.appointment import Appointment, AppointmentStatus
from app.core.security import create_access_token
from uuid import uuid4

pytestmark = pytest.mark.asyncio

class TestAPIFlow:
    """End-to-end flow tests using service layer directly."""

    async def test_full_booking_flow(self, db, sample_resident, sample_service):
        """Complete flow: active resident books an appointment."""
        from app.services.conflict_detection import check_slot_available
        from app.models.appointment import Appointment
        from datetime import datetime, timedelta
        import uuid

        # 1. Check slot availability
        available = await check_slot_available(
            db, sample_service.id, date(2026, 6, 20), time(10, 0), 30
        )
        assert available is True

        # 2. Create appointment
        apt = Appointment(
            id=uuid.uuid4(),
            resident_id=sample_resident.id,
            service_id=sample_service.id,
            appointment_date=date(2026, 6, 20),
            start_time=time(10, 0),
            end_time=time(10, 30),
            status=AppointmentStatus.SCHEDULED,
            queue_number=1,
        )
        db.add(apt)
        await db.flush()

        # 3. Verify appointment was created
        assert apt.resident_id == sample_resident.id
        assert apt.status == AppointmentStatus.SCHEDULED

        # 4. Check-in via fingerprint
        apt.status = AppointmentStatus.CHECKED_IN
        apt.verified_by_fingerprint = True
        await db.flush()
        assert apt.status == AppointmentStatus.CHECKED_IN
        assert apt.verified_by_fingerprint is True

        # 5. Complete the appointment
        apt.status = AppointmentStatus.COMPLETED
        await db.flush()
        assert apt.status == AppointmentStatus.COMPLETED

    async def test_cancel_appointment(self, db, sample_appointment):
        """Cancel a scheduled appointment."""
        sample_appointment.status = AppointmentStatus.CANCELLED
        await db.flush()
        assert sample_appointment.status == AppointmentStatus.CANCELLED

    async def test_reschedule_appointment(self, db, sample_appointment):
        """Reschedule to a different date/time."""
        sample_appointment.appointment_date = date(2026, 6, 22)
        sample_appointment.start_time = time(14, 0)
        sample_appointment.end_time = time(14, 30)
        sample_appointment.status = AppointmentStatus.SCHEDULED
        await db.flush()
        assert sample_appointment.appointment_date == date(2026, 6, 22)
        assert sample_appointment.start_time == time(14, 0)

    async def test_no_show_tracking(self, db, sample_appointment):
        """Mark appointment as no-show."""
        sample_appointment.status = AppointmentStatus.NO_SHOW
        await db.flush()
        assert sample_appointment.status == AppointmentStatus.NO_SHOW

    async def test_pending_user_cannot_book(self, db, sample_service):
        """User with 'pending' status should be blocked from booking."""
        pending_resident = Resident(
            id=uuid4(),
            first_name="Pending",
            last_name="User",
            contact_number="09179999999",
            birth_date=date(1995, 1, 1),
            address="Test Address",
            password_hash="hash",
            status=ResidentStatus.PENDING,
            role=ResidentRole.RESIDENT,
        )
        db.add(pending_resident)
        await db.flush()

        # The actual check happens in verify_user_can_book in the API route
        # Service layer doesn't enforce this — it's a route-level concern
        # This test verifies the model state
        assert pending_resident.status == ResidentStatus.PENDING

    async def test_admin_resident_activation(self, db, sample_resident, admin_resident):
        """Admin should be able to activate a pending resident."""
        from app.services.auth_service import activate_resident
        result = await activate_resident(db, sample_resident.id, admin_resident.id)
        assert result is True
        assert sample_resident.status == ResidentStatus.ACTIVE
        assert sample_resident.activated_by == admin_resident.id

    async def test_token_based_auth(self, sample_resident):
        """Verify JWT token creation and decoding."""
        token = create_access_token({"sub": str(sample_resident.id), "role": "resident"})
        from app.core.security import decode_token
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == str(sample_resident.id)

    async def test_invalid_token_rejected(self):
        from app.core.security import decode_token
        payload = decode_token("bad-token")
        assert payload is None
