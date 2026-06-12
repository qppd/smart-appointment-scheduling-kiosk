"""
Kiosk App — CustomTkinter entry point with modern window management.
"""
import customtkinter as ctk
from utils.theme import DARK_BG, TEAL_PRIMARY
from ui.screens import HomeScreen, FingerprintScreen, CheckInResultScreen, EnrollScreen, OverridePINScreen, AdminMenuScreen
from services.kiosk_service import KioskService

class KioskApp:
    def __init__(self):
        self.root = ctk.CTk()
        self.root.title("Barangay Dolores — Appointment Kiosk")
        self.root.geometry("1280x800")
        self.root.minsize(1024, 600)

        # Dark teal theme
        ctk.set_appearance_mode("dark")
        self.root.configure(fg_color=DARK_BG)

        # Fullscreen toggle
        self._fullscreen = False
        self.root.bind("<F11>", lambda e: self._toggle_fullscreen())
        self.root.bind("<Escape>", lambda e: self._exit_fullscreen() if self._fullscreen else None)

        # Kiosk service (serial + API)
        self.kiosk_service = KioskService()
        esp_ok = self.kiosk_service.initialize()

        # Container
        self.container = ctk.CTkFrame(self.root, fg_color="transparent")
        self.container.pack(fill="both", expand=True)
        self.container.grid_columnconfigure(0, weight=1)
        self.container.grid_rowconfigure(0, weight=1)

        self.current_screen = None
        self.show_home()

        if not esp_ok:
            self._show_float("⚠️  ESP32 not connected — check serial cable", is_error=True)

    # ── Navigation ──────────────────────────────────────────

    def show_home(self):
        self._switch(HomeScreen)

    def show_fingerprint_scan(self, mode: str = "checkin"):
        self._scan_mode = mode
        self._switch(FingerprintScreen)

    def show_checkin_result(self, result: dict):
        self._result = result
        self._switch(CheckInResultScreen)

    def show_enroll(self, resident_id: str = ""):
        self._switch(EnrollScreen)

    def show_pin_entry(self):
        self._switch(OverridePINScreen)

    def show_admin_menu(self):
        self._switch(AdminMenuScreen)

    # ── Internals ───────────────────────────────────────────

    def _switch(self, screen_cls):
        if self.current_screen:
            self.current_screen.destroy()
        self.current_screen = screen_cls(self.container, self)
        self.current_screen.grid(row=0, column=0, sticky="nsew")

    def _toggle_fullscreen(self):
        self._fullscreen = not self._fullscreen
        self.root.attributes("-fullscreen", self._fullscreen)

    def _exit_fullscreen(self):
        self._fullscreen = False
        self.root.attributes("-fullscreen", False)

    def _show_float(self, text: str, is_error: bool = False):
        """Floating toast overlay."""
        bg = "#dc2626" if is_error else TEAL_PRIMARY
        toast = ctk.CTkFrame(self.container, fg_color=bg, corner_radius=18, border_width=0)
        toast.place(relx=0.5, rely=0.85, anchor="center")

        ctk.CTkLabel(toast, text=text,
                     font=ctk.CTkFont(size=18),
                     text_color="white").pack(padx=32, pady=16)
        self.root.after(5000, toast.destroy)

    def run(self):
        self.root.mainloop()

    def cleanup(self):
        self.kiosk_service.cleanup()