"""
Main Kiosk Application — Tkinter touchscreen UI.
"""
import tkinter as tk
from tkinter import font as tkfont
from ui.screens import HomeScreen, FingerprintScreen, CheckInResultScreen, EnrollScreen
from services.kiosk_service import KioskService
from utils.display import set_fullscreen, COLORS, FONTS

class KioskApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Barangay Dolores — Appointment Kiosk")
        self.root.configure(bg=COLORS["bg"])

        # Set up fullscreen
        set_fullscreen(self.root, True)

        # Initialize kiosk service (ESP32 + API)
        self.kiosk_service = KioskService()
        esp_ok = self.kiosk_service.initialize()

        # Container for screens
        self.container = tk.Frame(root, bg=COLORS["bg"])
        self.container.pack(fill="both", expand=True)

        # Screens dictionary
        self.screens = {}
        self.current_screen = None

        # Show home screen
        self.show_home()

        # Show ESP32 status
        if not esp_ok:
            self.show_error("ESP32 not connected. Check serial connection.")

    def show_home(self):
        """Show the home/welcome screen."""
        self.clear_container()
        screen = HomeScreen(self.container, self)
        screen.pack(fill="both", expand=True)
        self.current_screen = "home"

    def show_fingerprint_scan(self, mode: str = "checkin"):
        """
        Show fingerprint scanning screen.

        Args:
            mode: "checkin" for checking in, "enroll" for enrollment
        """
        self.clear_container()
        screen = FingerprintScreen(self.container, self, mode)
        screen.pack(fill="both", expand=True)
        self.current_screen = "fingerprint"

    def show_checkin_result(self, result: dict):
        """Show the check-in result screen."""
        self.clear_container()
        screen = CheckInResultScreen(self.container, self, result)
        screen.pack(fill="both", expand=True)
        self.current_screen = "result"

    def show_enroll(self, resident_id: str = ""):
        """Show fingerprint enrollment screen."""
        self.clear_container()
        screen = EnrollScreen(self.container, self, resident_id)
        screen.pack(fill="both", expand=True)
        self.current_screen = "enroll"

    def show_error(self, message: str):
        """Show error overlay."""
        error_frame = tk.Frame(self.container, bg=COLORS["error_bg"], bd=2, relief="solid")
        error_frame.place(relx=0.1, rely=0.7, relwidth=0.8, relheight=0.2)

        tk.Label(
            error_frame,
            text=message,
            font=FONTS["small"],
            bg=COLORS["error_bg"],
            fg=COLORS["error_fg"],
            wraplength=800,
        ).pack(expand=True, fill="both", padx=20, pady=10)

        # Auto-remove after 5 seconds
        self.root.after(5000, error_frame.destroy)

    def clear_container(self):
        """Remove all widgets from container."""
        for widget in self.container.winfo_children():
            widget.destroy()

    def cleanup(self):
        """Clean up resources on exit."""
        self.kiosk_service.cleanup()
