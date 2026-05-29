from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
import httpx
from app.core.config import settings

async def send_sms(recipient: str, message: str) -> bool:
    """Send SMS via Semaphore API."""
    if not settings.SEMAPHORE_API_KEY:
        return False
    url = "https://api.semaphore.co/api/v4/messages"
    payload = {
        "apikey": settings.SEMAPHORE_API_KEY,
        "number": recipient,
        "message": message,
        "sendername": settings.SEMAPHORE_SENDER_NAME,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, data=payload)
        return resp.status_code == 200

async def create_notification(
    db: AsyncSession,
    appointment_id,
    notif_type: str,
    channel: str,
    recipient: str,
    message: str,
) -> Notification:
    notification = Notification(
        appointment_id=appointment_id,
        type=notif_type,
        channel=channel,
        recipient=recipient,
        message=message,
        status="pending",
    )
    db.add(notification)
    await db.flush()
    await db.refresh(notification)

    # Try to send if SMS
    success = False
    if channel == "sms":
        success = await send_sms(recipient, message)

    notification.status = "sent" if success else "failed"
    if success:
        notification.sent_at = datetime.now(timezone.utc)
    await db.flush()
    return notification
