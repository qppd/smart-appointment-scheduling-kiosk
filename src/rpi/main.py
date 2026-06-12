#!/usr/bin/env python3
"""
Barangay Dolores — Kiosk (CustomTkinter)
Modern touchscreen kiosk for appointment check-in & fingerprint enrollment.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ui.kiosk_app import KioskApp

def main():
    app = KioskApp()
    try:
        app.run()
    finally:
        app.cleanup()

if __name__ == "__main__":
    main()