import os
import sys
import json
from datetime import datetime, timedelta
import urllib.request
import urllib.parse

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, db as rtdb

# Optional: load .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configuration
FIREBASE_DATABASE_URL = os.environ.get("KIOSK_FIREBASE_DATABASE_URL")
SEMAPHORE_API_KEY = os.environ.get("SEMAPHORE_API_KEY")
FIREBASE_CREDENTIALS = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "./src/rpi/firebase-service-account.json")
SENDER_NAME = os.environ.get("SEMAPHORE_SENDER_NAME", "SEMAFOR")


def init_firebase():
    if not os.path.exists(FIREBASE_CREDENTIALS):
        print(f"[ERROR] Firebase credentials not found at {FIREBASE_CREDENTIALS}")
        sys.exit(1)
    cred = credentials.Certificate(FIREBASE_CREDENTIALS)
    firebase_admin.initialize_app(cred, {"databaseURL": FIREBASE_DATABASE_URL})


def normalize_phone(phone):
    digits = ''.join(c for c in phone if c.isdigit())
    if len(digits) == 11 and digits.startswith('09'):
        return digits
    if len(digits) == 12 and digits.startswith('63'):
        return '0' + digits[2:]
    if len(digits) == 13 and digits.startswith('639'):
        return '0' + digits[2:]
    return phone


def send_sms(phone, message):
    if not SEMAPHORE_API_KEY:
        print("[ERROR] SEMAPHORE_API_KEY not set, cannot send SMS")
        return False
    url = "https://api.semaphore.co/api/v4/messages"
    payload = {
        "apikey": SEMAPHORE_API_KEY,
        "number": normalize_phone(phone),
        "message": message,
        "sendername": SENDER_NAME,
    }
    data = urllib.parse.urlencode(payload).encode('utf-8')
    request = urllib.request.Request(url, data=data)
    try:
        response = urllib.request.urlopen(request)
        result = json.loads(response.read().decode('utf-8'))
        print(f"[SMS] Sent: {result}")
        return True
    except Exception as e:
        print(f"[ERROR] SMS failed: {e}")
        return False


def main():
    if not FIREBASE_DATABASE_URL:
        print("[ERROR] KIOSK_FIREBASE_DATABASE_URL not set")
        sys.exit(1)

    if not SEMAPHORE_API_KEY:
        print("[WARNING] SEMAPHORE_API_KEY not set, reminders will not be sent")

    init_firebase()

    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    # 25-35 minute reminder window to account for cron frequency
    window_start = now + timedelta(minutes=25)
    window_end = now + timedelta(minutes=35)

    ref = rtdb.reference("appointments")
    all_appts = ref.get() or {}

    for appt_id, appt in all_appts.items():
        if not isinstance(appt, dict)
or appt.get("status") != "scheduled":
            continue

        date = appt.get("appointment_date", "")
        if date != today:
            continue

        start_time = appt.get("start_time")
        if not start_time:
            continue

        try:
            appt_dt = datetime.strptime(f"{today} {start_time}", "%Y-%m-%d %I:%M %p")
        except ValueError:
            continue

        # Check if within the 25-35 minute reminder window
        if not (window_start <= appt_dt <= window_end):
            continue

        # Skip if already reminded
        if appt.get("sms_reminder_sent"):
            continue

        # Get user phone
        user_id = appt.get("resident_id")
        if not user_id:
            continue

        user = rtdb.reference(f"users/{user_id}").get() or {}
        phone = user.get("phone")

        if not phone:
            print(f"[SKIP] No phone for user {user_id}")
            continue

        # Send SMS reminder
        service_name = appt.get("service_name", "your appointment")
        message = (
            f"Reminder: Your appointment at Barangay Dolores is in 30 minutes! "
            f"Service: {service_name}. "
            f"Time: {appt.get('start_time')} - {appt.get('end_time')}. "
            f"Check-in opens 1 min before your scheduled time."
        )

        if send_sms(phone, message):
            ref.child(appt_id).update({
                "sms_reminder_sent": True,
                "sms_reminder_sent_at": now.isoformat()
            })
            print(f"[OK] Reminder sent for {appt_id}")
        else:
            print(f"[FAIL] Could not send reminder for {appt_id}")


if __name__ == "__main__":
    main()
