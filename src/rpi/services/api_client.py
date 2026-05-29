"""
API Client for communicating with the backend server.
"""
import httpx
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")
API_TOKEN = os.getenv("API_TOKEN", "")

class APIClient:
    def __init__(self):
        self.base_url = API_BASE_URL
        self.token = API_TOKEN
        self.client = httpx.Client(timeout=10.0)

    def _headers(self) -> dict:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def get_resident_by_fingerprint(self, template_id: int) -> Optional[dict]:
        """
        Look up a resident by their fingerprint template ID.
        The backend stores which template ID belongs to which resident.
        """
        try:
            resp = self.client.get(
                f"{self.base_url}/residents/",
                params={"fingerprint_template_id": template_id},
                headers=self._headers(),
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                return items[0] if items else None
            return None
        except Exception as e:
            print(f"[API] Error looking up resident: {e}")
            return None

    def get_today_appointment(self, resident_id: str) -> Optional[dict]:
        """Get today's appointment for a resident."""
        from datetime import date
        today = date.today().isoformat()
        try:
            resp = self.client.get(
                f"{self.base_url}/appointments/my",
                params={"date_filter": today},
                headers=self._headers(),
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                # Return the first upcoming appointment for today
                for apt in items:
                    if apt.get("appointment_date") == today and apt.get("status") in ("scheduled", "confirmed"):
                        return apt
            return None
        except Exception as e:
            print(f"[API] Error fetching appointment: {e}")
            return None

    def check_in_appointment(self, appointment_id: str, template_id: int) -> bool:
        """Mark an appointment as checked in with fingerprint verification."""
        try:
            resp = self.client.patch(
                f"{self.base_url}/appointments/{appointment_id}/status",
                params={"status": "checked_in"},
                headers=self._headers(),
            )
            return resp.status_code == 200
        except Exception as e:
            print(f"[API] Error checking in: {e}")
            return False

    def record_fingerprint_enrollment(self, resident_id: str, template_id: int) -> bool:
        """
        Record that a resident has enrolled their fingerprint.
        Sends the template ID from the ESP32 to the backend.
        """
        try:
            resp = self.client.patch(
                f"{self.base_url}/residents/{resident_id}",
                json={"fingerprint_template_id": template_id},
                headers=self._headers(),
            )
            return resp.status_code == 200
        except Exception as e:
            print(f"[API] Error recording enrollment: {e}")
            return False
