"""Shared test fixtures for backend tests.

Uses SQLite in-memory (via aiosqlite) to avoid needing PostgreSQL.
Overrides the settings DATABASE_URL so the app code uses the test DB.
"""
import pytest
import asyncio
from datetime import date, time, datetime, timezone, timedelta
import uuid
from typing import AsyncGenerator, AsyncIterator

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.core.database import Base

# ---------------------------------------------------------------------------
# Override settings before any app code imports them.
# We patch database_url to an in-memory SQLite DB.
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def test_settings() -> Settings:
    """Return settings with database_url overridden for testing."""
    s = Settings()
    s.DATABASE_URL = "sqlite+aiosqlite:///file::memory:?cache=shared"
    s.SECRET_KEY = "test-secret-key-for-testing-only"  # fixed so token tests are deterministic
    s.OTP_EXPIRE_MINUTES = 10
    s.SEMAPHORE_API_KEY = None  # no SMS in tests
    return s


# ---------------------------------------------------------------------------
# Event loop must be a session-scoped fixture for async fixtures to work.
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ---------------------------------------------------------------------------
# Engine: one engine per test session, tables created once.
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
async def engine(test_settings):
    # Patch the settings module-level variable so that app code reads the test URL.
    import app.core.config as cfg
    original_url = cfg.settings.DATABASE_URL
    cfg.settings.DATABASE_URL = test_settings.DATABASE_URL
    cfg.settings.SECRET_KEY = test_settings.SECRET_KEY
    cfg.settings.OTP_EXPIRE_MINUTES = test_settings.OTP_EXPIRE_MINUTES
    cfg.settings.SEMAPHORE_API_KEY = test_settings.SEMAPHORE_API_KEY

    eng = create_async_engine(test_settings.DATABASE_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()
    cfg.settings.DATABASE_URL = original_url


# ---------------------------------------------------------------------------
# Per-test session: each test gets a fresh transactional session.
# ---------------------------------------------------------------------------
@pytest.fixture
async def db(engine) -> AsyncIterator[AsyncSession]:
    """Provide a test-scoped async session that is rolled back after each test."""
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


# ---------------------------------------------------------------------------
# Helper fixtures: sample models
# ---------------------------------------------------------------------------
@pytest.fixture
async def sample_service(db: AsyncSession):
    """A single active service."""
    from app.models.service import Service
    svc = Service(
        id=uuid.uuid4(),
        name="Barangay Clearance",
        description="Test service for unit tests",
        duration_minutes=30,
        slot_capacity_per_day=20,
        is_active=True,
        department="Admin",
    )
    db.add(svc)
    await db.flush()
    await db.refresh(svc)
    return svc


@pytest.fixture
async def sample_resident(db: AsyncSession):
    """A verified, active resident for use in tests."""
    from app.models.resident import Resident, ResidentStatus, ResidentRole
    from app.core.security import get_password_hash
    res = Resident(
        id=uuid.uuid4(),
        first_name="Juan",
        last_name="Dela Cruz",
        contact_number="09171234567",
        birth_date=date(1990, 1, 15),
        address="123 Barangay Dolores, Taytay, Rizal",
        password_hash=get_password_hash("testpass123"),
        status=ResidentStatus.ACTIVE,
        role=ResidentRole.RESIDENT,
        otp_verified=True,
        fingerprint_template_id=1,
    )
    db.add(res)
    await db.flush()
    await db.refresh(res)
    return res


@pytest.fixture
async def sample_appointment(db: AsyncSession, sample_resident, sample_service):
    """A single scheduled appointment."""
    from app.models.appointment import Appointment, AppointmentStatus
    apt = Appointment(
        id=uuid.uuid4(),
        resident_id=sample_resident.id,
        service_id=sample_service.id,
        appointment_date=date(2026, 6, 15),
        start_time=time(9, 0),
        end_time=time(9, 30),
        status=AppointmentStatus.SCHEDULED,
        queue_number=1,
        verified_by_fingerprint=False,
    )
    db.add(apt)
    await db.flush()
    await db.refresh(apt)
    return apt


@pytest.fixture
async def admin_resident(db: AsyncSession):
    """An admin user for activation tests."""
    from app.models.resident import Resident, ResidentStatus, ResidentRole
    from app.core.security import get_password_hash
    admin = Resident(
        id=uuid.uuid4(),
        first_name="Admin",
        last_name="User",
        contact_number="09170000000",
        birth_date=date(1985, 1, 1),
        address="Barangay Hall, Taytay, Rizal",
        password_hash=get_password_hash("adminpass"),
        status=ResidentStatus.ACTIVE,
        role=ResidentRole.ADMIN,
        otp_verified=True,
    )
    db.add(admin)
    await db.flush()
    await db.refresh(admin)
    return admin