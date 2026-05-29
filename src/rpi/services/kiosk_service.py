"""
Kiosk Service — Business logic for the kiosk.
Orchestrates serial communication + API calls.
"""
from services.serial_handler import SerialHandler
from services.api_client import APIClient
from typing import Optional

class KioskService:
    def __init__(self):
        self.serial = SerialHandler()
        self.api = APIClient()

    def initialize(self) -> bool:
        """Initialize serial connection to ESP32."""
        return self.serial.connect()

    def cleanup(self):
        """Clean up resources."""
        self.serial.disconnect()

    def ping_esp32(self) -> bool:
        """Check if ESP32 is connected and responsive."""
        return self.serial.ping()

    def enroll_fingerprint(self, resident_id: str, slot: int = 1) -> Optional[int]:
        """
        Full enrollment flow:
        1. Tell ESP32 to enroll fingerprint at the given slot
        2. Get back the template ID
        3. Send template ID to backend to link with resident
        Returns the template ID if successful, None otherwise.
        """
        success, data = self.serial.enroll_fingerprint(slot)
        if not success:
            return None

        template_id = None
        try:
            template_id = int(data)
        except ValueError:
            # Try to extract from OK response
            pass

        if template_id:
            # Record enrollment in backend
            self.api.record_fingerprint_enrollment(resident_id, template_id)

        return template_id

    def verify_and_check_in(self) -> dict:
        """
        Full check-in flow:
        1. Scan fingerprint via ESP32
        2. Get matched template ID
        3. Look up resident by template ID
        4. Check if resident has an appointment today
        5. If yes, mark as checked in
        6. Return result dict with resident info and appointment status

        Returns:
            {
                "status": "matched_has_appointment" | "matched_no_appointment" | "not_matched",
                "resident": {...} | None,
                "appointment": {...} | None,
                "template_id": int | None,
                "message": str
            }
        """
        result = {
            "status": "not_matched",
            "resident": None,
            "appointment": None,
            "template_id": None,
            "message": "Fingerprint not recognized. Please see the front desk."
        }

        # Step 1 & 2: Scan and verify
        matched, template_id = self.serial.verify_fingerprint()
        if not matched or template_id is None:
            return result

        result["template_id"] = template_id
        result["status"] = "matched_no_appointment"

        # Step 3: Look up resident
        resident = self.api.get_resident_by_fingerprint(template_id)
        if not resident:
            result["message"] = "Fingerprint recognized but no account found. Please see the front desk."
            return result

        result["resident"] = resident

        # Step 4: Check today's appointment
        appointment = self.api.get_today_appointment(resident["id"])
        if not appointment:
            result["message"] = f"Good day, {resident['first_name']}! You have no appointment scheduled today."
            return result

        # Step 5: Check in
        check_in_ok = self.api.check_in_appointment(appointment["id"], template_id)
        if check_in_ok:
            result["status"] = "matched_has_appointment"
            result["appointment"] = appointment
            result["message"] = (
                f"Good morning, {resident['first_name']}! "
                f"Your {appointment['start_time']} appointment for "
                f"{appointment['service_name']} is confirmed. "
                f"Please proceed to the designated window."
            )

        return result
