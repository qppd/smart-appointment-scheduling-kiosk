"""
Kiosk Touchscreen Screens.
"""
import tkinter as tk
from tkinter import font as tkfont
from utils.display import COLORS, FONTS, create_button
from services.kiosk_service import KioskService
from typing import Optional

class HomeScreen(tk.Frame):
    """Welcome / Home screen for the kiosk."""
    def __init__(self, parent, app):
        super().__init__(parent, bg=COLORS["bg"])
        self.app = app
        self._build_ui()

    def _build_ui(self):
        # Barangay header
        tk.Label(
            self,
            text="Republic of the Philippines",
            font=FONTS["small"],
            bg=COLORS["bg"],
            fg=COLORS["bg_light"],
        ).pack(pady=(40, 0))

        tk.Label(
            self,
            text="Barangay Dolores",
            font=("Helvetica", 72, "bold"),
            bg=COLORS["bg"],
            fg=COLORS["fg"],
        ).pack(pady=(10, 0))

        tk.Label(
            self,
            text="Taytay, Rizal",
            font=FONTS["subtitle"],
            bg=COLORS["bg"],
            fg=COLORS["bg_light"],
        ).pack(pady=(0, 20))

        tk.Label(
            self,
            text="Appointment Check-in Kiosk",
            font=FONTS["body"],
            bg=COLORS["bg"],
            fg=COLORS["fg"],
        ).pack(pady=(10, 40))

        # Main action buttons
        btn_frame = tk.Frame(self, bg=COLORS["bg"])
        btn_frame.pack(expand=True)

        btn_checkin = create_button(
            btn_frame,
            text="📍 Check In for Appointment",
            command=lambda: self.app.show_fingerprint_scan("checkin"),
            bg="#0d9488",
            fg="#ffffff",
            active_bg="#0f766e",
            padx=60,
            pady=30,
        )
        btn_checkin.pack(pady=20)

        btn_enroll = create_button(
            btn_frame,
            text="✋ Enroll Fingerprint",
            command=lambda: self.app.show_fingerprint_scan("enroll"),
            bg="#2563eb",
            fg="#ffffff",
            active_bg="#1d4ed8",
            padx=60,
            pady=30,
        )
        btn_enroll.pack(pady=20)

        # Admin override
        tk.Label(
            self,
            text="For staff use: Admin Override (PIN)",
            font=FONTS["small"],
            bg=COLORS["bg"],
            fg=COLORS["bg_light"],
            cursor="hand2",
        ).pack(side="bottom", pady=20)


class FingerprintScreen(tk.Frame):
    """Screen shown during fingerprint scanning."""
    def __init__(self, parent, app, mode: str = "checkin"):
        super().__init__(parent, bg=COLORS["bg"])
        self.app = app
        self.mode = mode
        self._build_ui()

    def _build_ui(self):
        # Fingerprint icon (text-based)
        tk.Label(
            self,
            text="🖐️",
            font=("Helvetica", 100),
            bg=COLORS["bg"],
        ).pack(pady=(60, 20))

        title = "Please place your finger on the scanner" if self.mode == "checkin" else "New fingerprint enrollment"
        tk.Label(
            self,
            text=title,
            font=FONTS["title"],
            bg=COLORS["bg"],
            fg=COLORS["fg"],
            wraplength=900,
        ).pack(pady=20)

        # Status text
        self.status_label = tk.Label(
            self,
            text="Waiting for fingerprint...",
            font=FONTS["body"],
            bg=COLORS["bg"],
            fg=COLORS["bg_light"],
        )
        self.status_label.pack(pady=10)

        # Cancel button
        btn_cancel = create_button(
            self,
            text="Back to Home",
            command=lambda: self.app.show_home(),
            bg="#6b7280",
            fg="#ffffff",
            active_bg="#4b5563",
            padx=40,
            pady=15,
        )
        btn_cancel.pack(side="bottom", pady=30)

        # Start scanning after a short delay
        self.after(1500, self._do_scan)

    def _do_scan(self):
        """Perform the fingerprint scan."""
        self.status_label.config(text="Scanning...")

        if self.mode == "checkin":
            result = self.app.kiosk_service.verify_and_check_in()
            self.app.show_checkin_result(result)
        elif self.mode == "enroll":
            # For enrollment, staff should enter resident ID first
            # This is simplified — in production, staff would select from a list
            self.app.show_enroll(resident_id="")


class CheckInResultScreen(tk.Frame):
    """Result screen after fingerprint check-in."""
    def __init__(self, parent, app, result: dict):
        super().__init__(parent)
        self.app = app
        self.result = result
        self._build_ui()

    def _build_ui(self):
        status = self.result.get("status", "not_matched")
        message = self.result.get("message", "")

        if status == "matched_has_appointment":
            bg_color = COLORS["success_bg"]
            fg_color = COLORS["success_fg"]
            icon = "✅"
            icon_size = 120

            # Appointment details
            appointment = self.result.get("appointment", {})
            resident = self.result.get("resident", {})

        elif status == "matched_no_appointment":
            bg_color = COLORS["warning_bg"]
            fg_color = COLORS["warning_fg"]
            icon = "ℹ️"
            icon_size = 100
        else:
            bg_color = COLORS["error_bg"]
            fg_color = COLORS["error_fg"]
            icon = "❌"
            icon_size = 100

        self.configure(bg=bg_color)

        # Icon
        tk.Label(
            self,
            text=icon,
            font=("Helvetica", icon_size),
            bg=bg_color,
        ).pack(pady=(60, 20))

        # Message
        tk.Label(
            self,
            text=message,
            font=FONTS["title"],
            bg=bg_color,
            fg=fg_color,
            wraplength=900,
            justify="center",
        ).pack(pady=20)

        # Additional info for matched cases
        if status == "matched_has_appointment":
            appointment = self.result.get("appointment", {})
            details_frame = tk.Frame(self, bg=bg_color)
            details_frame.pack(pady=20)

            tk.Label(
                details_frame,
                text=f"Queue Number: #{appointment.get('queue_number', 'N/A')}",
                font=FONTS["large"],
                bg=bg_color,
                fg=fg_color,
            ).pack()

            tk.Label(
                details_frame,
                text=f"Service: {appointment.get('service_name', 'N/A')}",
                font=FONTS["body"],
                bg=bg_color,
                fg=fg_color,
            ).pack()

        # Home button
        btn_home = create_button(
            self,
            text="Back to Home",
            command=lambda: self.app.show_home(),
            bg="#4b5563" if status != "matched_has_appointment" else "#166534",
            fg="#ffffff",
            active_bg="#374151",
            padx=40,
            pady=15,
        )
        btn_home.pack(side="bottom", pady=40)

        # Auto-return to home after a delay
        if status == "matched_has_appointment":
            self.after(15000, self.app.show_home)
        else:
            self.after(8000, self.app.show_home)


class EnrollScreen(tk.Frame):
    """Fingerprint enrollment screen."""
    def __init__(self, parent, app, resident_id: str = ""):
        super().__init__(parent, bg=COLORS["bg"])
        self.app = app
        self.resident_id = resident_id
        self._build_ui()

    def _build_ui(self):
        tk.Label(
            self,
            text="✋ Fingerprint Enrollment",
            font=FONTS["title"],
            bg=COLORS["bg"],
            fg=COLORS["fg"],
        ).pack(pady=(60, 20))

        tk.Label(
            self,
            text="Please place the same finger on the scanner THREE times",
            font=FONTS["body"],
            bg=COLORS["bg"],
            fg=COLORS["bg_light"],
            wraplength=800,
        ).pack(pady=20)

        self.status_label = tk.Label(
            self,
            text="Step 1 of 3: Place finger...",
            font=FONTS["large"],
            bg=COLORS["bg"],
            fg=COLORS["fg"],
        )
        self.status_label.pack(pady=30)

        # Back button
        btn_back = create_button(
            self,
            text="Cancel",
            command=lambda: self.app.show_home(),
            bg="#6b7280",
            fg="#ffffff",
            active_bg="#4b5563",
            padx=40,
            pady=15,
        )
        btn_back.pack(side="bottom", pady=30)
