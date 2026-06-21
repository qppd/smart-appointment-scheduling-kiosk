#!/usr/bin/env python3
"""
Barangay Dolores — Kiosk GUI entry point (RPi4).
Launches the customtkinter touchscreen kiosk app that:
- Polls Firebase Realtime Database for kiosk_commands
- Communicates with ESP32 over UART for fingerprint operations
- Serves the on-touchscreen flow: Home → Verify → Result, plus Admin
"""

import os
import sys
import signal
import traceback
from dotenv import load_dotenv

load_dotenv()

if not all([
    os.environ.get("KIOSK_FIREBASE_API_KEY"),
    os.environ.get("KIOSK_FIREBASE_DATABASE_URL"),
    os.environ.get("KIOSK_EMAIL"),
    os.environ.get("KIOSK_PASSWORD"),
]):
    print("[ERROR] Missing required environment variables. Check .env file.")
    sys.exit(1)

if not all([
    os.environ.get("KIOSK_FIREBASE_AUTH_DOMAIN"),
    os.environ.get("KIOSK_FIREBASE_STORAGE_BUCKET"),
]):
    print("[WARN] Some optional FIREBASE config values missing.")

try:
    from gui.app import KioskApp
except Exception as e:
    print("[ERROR] Failed to import GUI:", e)
    traceback.print_exc()
    sys.exit(1)


def main():
    kiosk = KioskApp()

    def signal_handler(sig, frame):
        print("[KIOSK] Shutting down...")
        kiosk.running = False
        kiosk.quit()
        kiosk.destroy()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, signal_handler)

    kiosk.mainloop()


if __name__ == "__main__":
    main()