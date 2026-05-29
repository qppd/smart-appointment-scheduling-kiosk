#!/usr/bin/env python3
"""
Barangay Dolores — Kiosk Main Entry Point
Runs the touchscreen kiosk UI and manages ESP32 communication.
"""
import tkinter as tk
from ui.kiosk_app import KioskApp

def main():
    root = tk.Tk()
    app = KioskApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
