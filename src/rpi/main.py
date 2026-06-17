#!/usr/bin/env python3
"""
Barangay Dolores - Kiosk Firebase Listener (RPi4)
Uses pyrebase4 to listen to Firebase Realtime Database for commands,
dispatches them to ESP32 over serial (micro USB), and writes results back to RTDB.
"""
import os
import sys
import time
import signal
import threading
import traceback
from dotenv import load_dotenv

load_dotenv()

import pyrebase
from services.serial_handler import SerialHandler
from services.command_processor import CommandProcessor


# --- Configuration ---
SERIAL_PORT = os.environ.get("SERIAL_PORT", "/dev/ttyUSB0")
SERIAL_BAUD = int(os.environ.get("SERIAL_BAUD", "115200"))

FIREBASE_CONFIG = {
    "apiKey": os.environ.get("KIOSK_FIREBASE_API_KEY"),
    "authDomain": os.environ.get("KIOSK_FIREBASE_AUTH_DOMAIN"),
    "databaseURL": os.environ.get("KIOSK_FIREBASE_DATABASE_URL"),
    "storageBucket": os.environ.get("KIOSK_FIREBASE_STORAGE_BUCKET"),
}

KIOSK_EMAIL = os.environ.get("KIOSK_EMAIL")
KIOSK_PASSWORD = os.environ.get("KIOSK_PASSWORD")


class FirebaseAuthWrapper:
    """Handles sign-in and automatic token refresh."""
    def __init__(self, auth):
        self.auth = auth
        self.user = None
        self.id_token = None
        self.refresh_token = None
        self._sign_in()

    def _sign_in(self):
        try:
            self.user = self.auth.sign_in_with_email_and_password(KIOSK_EMAIL, KIOSK_PASSWORD)
            self.id_token = self.user["idToken"]
            self.refresh_token = self.user["refreshToken"]
            print(f"[AUTH] Signed in as {KIOSK_EMAIL}")
        except Exception as e:
            print(f"[AUTH] Failed: {e}")
            sys.exit(1)

    def refresh_if_needed(self):
        # RTDB tokens last 1 hour.
        try:
            user = self.auth.refresh(self.refresh_token)
            self.id_token = user["idToken"]
            print("[AUTH] Token refreshed")
        except Exception as e:
            print(f"[AUTH] Refresh failed: {e}")


class KioskService:
    def __init__(self):
        # Firebase
        self.firebase = pyrebase.initialize_app(FIREBASE_CONFIG)
        self.auth = self.firebase.auth()
        self.db = self.firebase.database()
        self.fb_auth = FirebaseAuthWrapper(self.auth)

        # Serial
        self.serial = SerialHandler(port=SERIAL_PORT, baud=SERIAL_BAUD)
        if not self.serial.connect():
            # Try to auto-dect port
            port = SerialHandler.find_esp32_port()
            if port:
                print(f"[SERIAL] Auto-detected port {port}, retrying...")
                self.serial = SerialHandler(port=port, baud=SERIAL_BAUD)
                if not self.serial.connect():
                    print("[WARN] ESP32 not detected. Will retry on command.")
            else:
                print("[WARN] ESP32 not detected. Will retry on command.")

        self.processor = CommandProcessor(self.serial)
        self.processed_ids = set()
        self.running = True

    def _process_commands(self):
        """Poll for pending kiosk commands and process them."""
        try:
            response = self.db.child("kiosk_commands").get(self.fb_auth.id_token)
            if not response or not isinstance(response, dict):
                return
            for cmd_id, cmd_data in response.items():
                if not isinstance(cmd_data, dict):
                    continue
                if cmd_data.get("status") != "pending":
                    continue
                if cmd_id in self.processed_ids:
                    continue
                print(f"[COMMAND] {cmd_id}: {cmd_data['type']}")
                result = self.processor.process(cmd_data)
                self.db.child("kiosk_commands").child(cmd_id).update({
                    "status": result.get("status", "completed"),
                    "result": result,
                    "completed_at": int(time.time() * 1000),
                }, self.fb_auth.id_token)
                self.processed_ids.add(cmd_id)
        except Exception:
            print("[ERROR] Command processing failed:")
            traceback.print_exc()

    def _heartbeat(self):
        while self.running:
            try:
                esp_connected = self.serial.ser is not None and self.serial.ser.is_open
                self.db.child("kiosk_status").child("default").update({
                    "online": True,
                    "last_heartbeat": int(time.time() * 1000),
                    "esp32_connected": esp_connected,
                    "template_count": self.serial.get_template_count() if esp_connected else 0,
                }, self.fb_auth.id_token)
            except Exception as e:
                print(f"[HEARTBEAT] Error: {e}")
            time.sleep(10)

    def _refresh_loop(self):
        while self.running:
            time.sleep(3000)  # 50 minutes
            self.fb_auth.refresh_if_needed()

    def run(self):
        threading.Thread(target=self._heartbeat, daemon=True).start()
        threading.Thread(target=self._refresh_loop, daemon=True).start()
        print("[KIOSK] Running. Press Ctrl+C to stop.")
        while self.running:
            self._process_commands()
            time.sleep(2)
        self.serial.disconnect()

    def stop(self):
        self.running = False
        print("[KIOSK] Stopped.")


def main():
    if not all([FIREBASE_CONFIG["apiKey"], FIREBASE_CONFIG["databaseURL"], KIOSK_EMAIL, KIOSK_PASSWORD]):
        print("[ERROR] Missing required environment variables. Check .env file.")
        sys.exit(1)

    kiosk = KioskService()

    def signal_handler(sig, frame):
        kiosk.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    kiosk.run()


if __name__ == "__main__":
    main()
