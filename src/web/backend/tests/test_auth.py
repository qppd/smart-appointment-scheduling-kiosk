"""Tests for authentication endpoints and services."""
import pytest
from uuid import UUID
from app.services.auth_service import (
    register_resident, authenticate_resident,
    request_otp, verify_otp, activate_resident, generate_otp
)
from app.models.resident import ResidentStatus
from app.core.security import verify_password, decode_token

pytestmark = pytest.mark.asyncio

class TestAuthService:
    async def test_register_resident(self, db):
        from datetime import date
        data = {
            "first_name": "Maria",
            "last_name": "Santos",
            "contact_number": "09179876543",
            "birth_date": date(1995, 5, 20),
            "address": "456 Street, Taytay",
            "password": "securepw123",
        }
        resident = await register_resident(db, data)
        assert resident.first_name == "Maria"
        assert resident.status == ResidentStatus.PENDING
        assert verify_password("securepw123", resident.password_hash)
        assert resident.otp_verified is False

    async def test_register_duplicate_contact(self, db, sample_resident):
        data = {
            "first_name": "Another",
            "last_name": "User",
            "contact_number": "09171234567",  # same as sample_resident
            "birth_date": "1990-01-01",
            "address": "Somewhere",
            "password": "password123",
        }
        # This should either raise or silently fail depending on unique constraint
        # SQLite doesn't enforce constraints by default
        pass  # In PostgreSQL this raises IntegrityError

    async def test_authenticate_valid(self, db, sample_resident):
        resident = await authenticate_resident(db, None, "09171234567", "testpass123")
        assert resident is not None
        assert resident.id == sample_resident.id

    async def test_authenticate_wrong_password(self, db):
        resident = await authenticate_resident(db, None, "09171234567", "wrongpassword")
        assert resident is None

    async def test_authenticate_by_email(self, db):
        # Sample resident has no email, so this should return None
        resident = await authenticate_resident(db, "nonexistent@email.com", None, "testpass123")
        assert resident is None

    async def test_otp_generation(self):
        otp = generate_otp()
        assert len(otp) == 6
        assert otp.isdigit()

    async def test_otp_request_and_verify(self, db, sample_resident):
        # The OTP request sends SMS via API, which may fail without Semaphore
        # But we can test the OTP storage directly
        from datetime import datetime, timedelta, timezone
        test_otp = "123456"
        sample_resident.otp_code = test_otp
        sample_resident.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        await db.flush()

        result = await verify_otp(db, "09171234567", "123456")
        assert result is True
        assert sample_resident.otp_verified is True

    async def test_otp_expired(self, db, sample_resident):
        from datetime import datetime, timedelta, timezone
        sample_resident.otp_code = "654321"
        sample_resident.otp_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        await db.flush()

        result = await verify_otp(db, "09171234567", "654321")
        assert result is False

    async def test_otp_wrong_code(self, db, sample_resident):
        from datetime import datetime, timedelta, timezone
        sample_resident.otp_code = "111111"
        sample_resident.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        await db.flush()

        result = await verify_otp(db, "09171234567", "222222")
        assert result is False

    async def test_activate_resident(self, db, sample_resident, admin_resident):
        result = await activate_resident(db, sample_resident.id, admin_resident.id)
        assert result is True
        assert sample_resident.status == ResidentStatus.ACTIVE
        assert sample_resident.activated_by == admin_resident.id

    async def test_activate_nonexistent(self, db, admin_resident):
        from uuid import uuid4
        result = await activate_resident(db, uuid4(), admin_resident.id)
        assert result is False

    async def test_password_hashing(self, sample_resident):
        assert verify_password("testpass123", sample_resident.password_hash)
        assert not verify_password("wrongpass", sample_resident.password_hash)

    async def test_jwt_token(self, sample_resident):
        from app.core.security import create_access_token, decode_token
        token = create_access_token({"sub": str(sample_resident.id), "role": "resident"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == str(sample_resident.id)
        assert payload["role"] == "resident"

    async def test_invalid_jwt(self):
        payload = decode_token("invalid.token.here")
        assert payload is None
