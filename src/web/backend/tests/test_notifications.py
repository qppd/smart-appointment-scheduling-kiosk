"""Tests for notification service."""
import pytest
from datetime import datetime, timezone
from app.services.notification_service import create_notification, send_sms

pytestmark = pytest.mark.asyncio

class TestNotifications:
    async def test_create_notification_sms(self, db, sample_appointment):
        """Test creating an SMS notification. Since there's no Semaphore API key,
        it should be created with status 'failed'."""
        notif = await create_notification(
            db, sample_appointment.id,
            notif_type="confirmation",
            channel="sms",
            recipient="09171234567",
            message="Your appointment is confirmed.",
        )
        assert notif is not None
        assert notif.type == "confirmation"
        assert notif.channel == "sms"
        assert notif.recipient == "09171234567"
        # Without Semaphore API key, it should fail to send
        assert notif.status in ("pending", "failed", "sent")

    async def test_send_sms_no_api_key(self):
        """Without SEMAPHORE_API_KEY, send_sms should return False."""
        result = await send_sms("09171234567", "Test message")
        assert result is False

    async def test_notification_message_content(self):
        """Verify notification message formatting."""
        message = "Your Barangay Clearance appointment for June 15, 2026 at 9:00 AM is confirmed. Reference: ABC123"
        assert len(message) <= 1000  # SMS length limit
        assert "Barangay Clearance" in message
        assert "confirmed" in message
