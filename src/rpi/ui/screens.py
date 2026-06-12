"""
Kiosk screens — CustomTkinter, animated, modern 2026 UX.
"""
from __future__ import annotations
import tkinter as tk
import os
from typing import Optional, Callable
import customtkinter as ctk
from utils.theme import *
from services.kiosk_service import KioskService
from services.api_client import APIClient
from utils.display import COLORS, FONTS

# ── Shared component factory ───────────────────────────────────

def KButton(master, text: str, command: Callable,
            color: str = TEAL_PRIMARY, hover: str = TEAL_LIGHT,
            height: int = 72, width: int = 420, font_size: int = 22,
            icon: str = "") -> ctk.CTkButton:
    """Modern kiosk button with hover lift."""
    return ctk.CTkButton(
        master,
        text=f"{icon}  {text}" if icon else text,
        command=command,
        font=ctk.CTkFont(family="Segoe UI", size=font_size, weight="bold"),
        fg_color=color,
        hover_color=hover,
        text_color=WHITE,
        height=height,
        width=width,
        corner_radius=18,
        border_width=0,
        cursor="hand2",
    )

def KCard(master, **grid_kw) -> ctk.CTkFrame:
    """Elevated card surface."""
    return ctk.CTkFrame(master, fg_color=CARD, corner_radius=20,
                        border_width=1, border_color=BORDER, **grid_kw)

def KHeading(master, text: str, size: int = 52, **kw) -> ctk.CTkLabel:
    return ctk.CTkLabel(
        master, text=text,
        font=ctk.CTkFont(family="Segoe UI", size=size, weight="bold"),
        text_color=TEXT_BRIGHT, **kw,
    )

def KSub(master, text: str, size: int = 20, **kw) -> ctk.CTkLabel:
    return ctk.CTkLabel(
        master, text=text,
        font=ctk.CTkFont(family="Segoe UI", size=size),
        text_color=TEXT_MUTED, **kw,
    )

def KIcon(master, emoji: str, size: int = 80) -> ctk.CTkLabel:
    return ctk.CTkLabel(master, text=emoji,
                        font=ctk.CTkFont(size=size), text_color=TEXT_BRIGHT)


# ── Screens ────────────────────────────────────────────────────

class BaseScreen(ctk.CTkFrame):
    """Base with fade-in helper."""

    def __init__(self, parent, app):
        super().__init__(parent, fg_color="transparent")
        self.app = app
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        self._alpha = 0
        self._fade_id = None
        self._build()
        self.after(50, self._fade_in)

    def _fade_in(self):
        self._alpha = min(1.0, self._alpha + 0.08)
        self.configure(fg_color=DARK_BG)
        if self._alpha < 1.0:
            self._fade_id = self.after(20, self._fade_in)

    def _build(self):
        raise NotImplementedError

    def destroy(self):
        if self._fade_id:
            self.after_cancel(self._fade_id)
        super().destroy()


class HomeScreen(BaseScreen):
    """Welcome / landing — big, bold, minimal."""

    def _build(self):
        container = ctk.CTkFrame(self, fg_color="transparent")
        container.place(relx=0.5, rely=0.5, anchor="center")
        container.grid_columnconfigure(0, weight=1)

        # ── Header ──
        KSub(container, "REPUBLIC OF THE PHILIPPINES", size=16).grid(row=0, pady=(0, 4))
        KHeading(container, "Barangay Dolores", size=64).grid(row=1)
        KSub(container, "Taytay, Rizal", size=22).grid(row=2, pady=(0, 12))
        KSub(container, "Appointment Check‑in Kiosk", size=18).grid(row=3, pady=(0, 60))

        # ── Buttons ──
        btn_frame = ctk.CTkFrame(container, fg_color="transparent")
        btn_frame.grid(row=4)
        btn_frame.grid_columnconfigure((0, 1), weight=1)

        KButton(btn_frame, "Check In", command=lambda: self.app.show_fingerprint_scan("checkin"),
                color=TEAL_PRIMARY, hover=TEAL_GLOW, icon="📍", width=360).grid(row=0, column=0, padx=18, pady=12)

        KButton(btn_frame, "Enroll Fingerprint", command=lambda: self.app.show_fingerprint_scan("enroll"),
                color=BLUE_ACCENT, hover="#60a5fa", icon="✋", width=360).grid(row=0, column=1, padx=18, pady=12)

        # ── Staff hint ──
        # Subtle gear icon bottom-right — opens admin PIN
        admin_btn = ctk.CTkButton(
            self, text="⚙️",
            command=lambda: self.app.show_pin_entry(),
            fg_color="transparent", text_color=TEXT_MUTED,
            hover_color=CARD, corner_radius=50,
            width=40, height=40,
            font=ctk.CTkFont(size=20),
            cursor="hand2",
        )
        admin_btn.place(relx=0.96, rely=0.96, anchor="se")


class FingerprintScreen(BaseScreen):
    """Scanning / enrollment state — pulsing animation feel."""

    def _build(self):
        self.mode = getattr(self.app, '_scan_mode', "checkin")
        container = ctk.CTkFrame(self, fg_color="transparent")
        container.place(relx=0.5, rely=0.45, anchor="center")
        container.grid_columnconfigure(0, weight=1)

        KIcon(container, "🖐️", size=120).grid(row=0)
        title = "Place your finger on the scanner" if self.mode == "checkin" else "New fingerprint enrollment"
        KHeading(container, title, size=40).grid(row=1, pady=(20, 8))
        self.status = KSub(container, "Waiting for fingerprint...", size=22)
        self.status.grid(row=2)

        self._pulse()

        ctk.CTkButton(
            container, text="←  Back to Home",
            command=lambda: self.app.show_home(),
            fg_color="transparent", text_color=TEXT_MUTED,
            hover_color=CARD, corner_radius=14, height=44,
            font=ctk.CTkFont(size=18),
        ).grid(row=3, pady=(60, 0))

        # Start scan after a beat
        self.after(1800, self._do_scan)

    def _pulse(self):
        """Subtle opacity pulse on status text."""
        fg = self.status.cget("text_color")
        if isinstance(fg, tuple):
            fg = fg[0]
        self.after(600, lambda: self.status.configure(text_color=TEXT_BRIGHT))
        self.after(1200, lambda: self.status.configure(text_color=TEXT_MUTED))
        self._pulse_id = self.after(1800, self._pulse)

    def _do_scan(self):
        if self.mode == "checkin":
            result = self.app.kiosk_service.verify_and_check_in()
            self.app.show_checkin_result(result)
        else:
            self.app.show_enroll("")

    def destroy(self):
        if hasattr(self, '_pulse_id'):
            self.after_cancel(self._pulse_id)
        super().destroy()


class CheckInResultScreen(BaseScreen):
    """Result — green check / amber warning / red error."""

    def _build(self):
        self.result = getattr(self.app, '_result', {})
        status = self.result.get("status", "not_matched")
        message = self.result.get("message", "")

        color_map = {
            "matched_has_appointment": (GREEN_DARK, GREEN_ACCENT, "✅"),
            "matched_no_appointment": (AMBER_ACCENT, AMBER_ACCENT, "ℹ️"),
        }
        bg_card, accent, icon = color_map.get(status, (RED_ACCENT, RED_ACCENT, "❌"))
        if status not in color_map:
            bg_card = RED_ACCENT

        container = ctk.CTkFrame(self, fg_color="transparent")
        container.place(relx=0.5, rely=0.4, anchor="center")
        container.grid_columnconfigure(0, weight=1)

        # Icon
        ctk.CTkLabel(container, text=icon,
                     font=ctk.CTkFont(size=100), text_color=WHITE).grid(row=0)

        # Message
        ctk.CTkLabel(container, text=message, wraplength=900, justify="center",
                     font=ctk.CTkFont(family="Segoe UI", size=30, weight="bold"),
                     text_color=WHITE).grid(row=1, pady=(20, 10))

        # Queue / details card for matched + appointment
        if status == "matched_has_appointment":
            apt = self.result.get("appointment", {})
            card = KCard(container)
            card.grid(row=2, pady=30, ipadx=40, ipady=20)

            for i, (label, val) in enumerate([
                ("Queue Number", f"#{apt.get('queue_number', 'N/A')}"),
                ("Service", apt.get("service_name", "N/A")),
                ("Time", apt.get("start_time", "")),
            ]):
                row_f = ctk.CTkFrame(card, fg_color="transparent")
                row_f.pack(fill="x", pady=6)
                ctk.CTkLabel(row_f, text=label,
                             font=ctk.CTkFont(size=18), text_color=TEXT_MUTED).pack(side="left")
                ctk.CTkLabel(row_f, text=val,
                             font=ctk.CTkFont(size=20, weight="bold"), text_color=WHITE).pack(side="right")

        # Home button
        ctk.CTkButton(
            container, text="←  Back to Home",
            command=lambda: self.app.show_home(),
            fg_color="transparent", text_color=TEXT_MUTED,
            hover_color=CARD, corner_radius=14, height=44,
            font=ctk.CTkFont(size=18),
        ).grid(row=3, pady=(30, 0))

        # Auto return
        delay = 15000 if status == "matched_has_appointment" else 8000
        self.after(delay, self.app.show_home)


class EnrollScreen(BaseScreen):
    """Fingerprint enrollment wizard."""

    def _build(self):
        container = ctk.CTkFrame(self, fg_color="transparent")
        container.place(relx=0.5, rely=0.45, anchor="center")
        container.grid_columnconfigure(0, weight=1)

        KIcon(container, "✋", size=100).grid(row=0)
        KHeading(container, "Fingerprint Enrollment", size=42).grid(row=1, pady=(12, 8))
        KSub(container, "Place the same finger on the scanner\ntHREE times for best results",
             size=20).grid(row=2)

        self.step_label = ctk.CTkLabel(
            container, text="Step 1 of 3: Place finger...",
            font=ctk.CTkFont(family="Segoe UI", size=28, weight="bold"),
            text_color=TEAL_LIGHT,
        )
        self.step_label.grid(row=3, pady=40)

        ctk.CTkButton(
            container, text="Cancel  ✕",
            command=lambda: self.app.show_home(),
            fg_color="transparent", text_color=TEXT_MUTED,
            hover_color=CARD, corner_radius=14, height=44,
            font=ctk.CTkFont(size=18),
        ).grid(row=4)


# ── Admin Override Screen ───────────────────────────────────────

ADMIN_PIN = os.getenv("KIOSK_ADMIN_PIN", "123456")

class OverridePINScreen(BaseScreen):
    """Hidden PIN entry for staff/admin override."""

    def _build(self):
        # Dim background overlay
        self.configure(fg_color="#000000")
        self.after(50, lambda: self.configure(fg_color="transparent"))

        container = ctk.CTkFrame(self, fg_color=SURFACE, corner_radius=24)
        container.place(relx=0.5, rely=0.5, anchor="center")
        container.grid_columnconfigure(0, weight=1)

        KIcon(container, "🔐", size=60).grid(row=0, pady=(30, 10))
        KSub(container, "Staff Access", size=16).grid(row=1)
        KHeading(container, "Enter PIN", size=38).grid(row=2, pady=(4, 24))

        # PIN display
        self.pin_display = ctk.CTkLabel(
            container, text="••••••",
            font=ctk.CTkFont(family="Segoe UI", size=42, weight="bold"),
            text_color=TEAL_LIGHT,
        )
        self.pin_display.grid(row=3, pady=(0, 20))

        self.pin = ""
        self._max_digits = 6

        # Numeric keypad
        keypad = ctk.CTkFrame(container, fg_color="transparent")
        keypad.grid(row=4, padx=24, pady=(0, 20))
        for i in range(9):
            r, c = divmod(i, 3)
            btn = ctk.CTkButton(
                keypad, text=str(i + 1),
                command=lambda d=str(i + 1): self._press(d),
                fg_color=CARD, hover_color=TEAL_DARK,
                text_color=WHITE, width=72, height=72,
                corner_radius=16,
                font=ctk.CTkFont(size=28, weight="bold"),
            )
            btn.grid(row=r, column=c, padx=6, pady=6)

        # Bottom row: backspace, 0, enter
        ctk.CTkButton(
            keypad, text="⌫",
            command=self._backspace,
            fg_color=CARD, hover_color=RED_ACCENT,
            text_color=WHITE, width=72, height=72,
            corner_radius=16,
            font=ctk.CTkFont(size=28),
        ).grid(row=3, column=0, padx=6, pady=6)

        ctk.CTkButton(
            keypad, text="0",
            command=lambda: self._press("0"),
            fg_color=CARD, hover_color=TEAL_DARK,
            text_color=WHITE, width=72, height=72,
            corner_radius=16,
            font=ctk.CTkFont(size=28, weight="bold"),
        ).grid(row=3, column=1, padx=6, pady=6)

        ctk.CTkButton(
            keypad, text="✓",
            command=self._submit,
            fg_color=TEAL_PRIMARY, hover_color=TEAL_LIGHT,
            text_color=WHITE, width=72, height=72,
            corner_radius=16,
            font=ctk.CTkFont(size=28, weight="bold"),
        ).grid(row=3, column=2, padx=6, pady=6)

        # Cancel / back
        ctk.CTkButton(
            container, text="←  Back",
            command=lambda: self.app.show_home(),
            fg_color="transparent", text_color=TEXT_MUTED,
            hover_color=CARD, corner_radius=14, height=40,
            font=ctk.CTkFont(size=16),
        ).grid(row=5, pady=(0, 20))

    def _press(self, digit: str):
        if len(self.pin) < self._max_digits:
            self.pin += digit
            self.pin_display.configure(text="•" * len(self.pin))

    def _backspace(self):
        if self.pin:
            self.pin = self.pin[:-1]
            self.pin_display.configure(text="•" * len(self.pin) if self.pin else "••••••")

    def _submit(self):
        if self.pin == ADMIN_PIN:
            self.app.show_admin_menu()
        else:
            self.pin = ""
            self.pin_display.configure(text="❌  Wrong PIN", text_color=RED_ACCENT)
            self.after(1500, lambda: self.pin_display.configure(text="••••••", text_color=TEAL_LIGHT))


class AdminMenuScreen(BaseScreen):
    """Admin override menu — manual check-in, view appointments, toggle."""

    def _build(self):
        container = ctk.CTkFrame(self, fg_color="transparent")
        container.place(relx=0.5, rely=0.5, anchor="center")
        container.grid_columnconfigure(0, weight=1)

        KIcon(container, "⚙️", size=56).grid(row=0, pady=(10, 4))
        KHeading(container, "Admin Menu", size=40).grid(row=1, pady=(0, 8))
        KSub(container, "Staff Override Mode", size=16).grid(row=2, pady=(0, 36))

        KButton(container, "Manual Check-in (by ID)",
                command=lambda: self._request_checkin(),
                color=TEAL_PRIMARY, hover=TEAL_GLOW,
                icon="📝", width=380).grid(row=3, pady=8)

        KButton(container, "View Today's Appointments",
                command=self._view_today,
                color=BLUE_ACCENT, hover="#60a5fa",
                icon="📋", width=380).grid(row=4, pady=8)

        KButton(container, "Lookup Resident",
                command=self._lookup_resident,
                color="#7c3aed", hover="#a78bfa",
                icon="🔍", width=380).grid(row=5, pady=8)

        # Logout / Lock
        ctk.CTkButton(
            container, text="🔒  Lock & Return",
            command=lambda: self.app.show_home(),
            fg_color="transparent", text_color=TEXT_MUTED,
            hover_color=CARD, corner_radius=14, height=50,
            font=ctk.CTkFont(size=18),
        ).grid(row=6, pady=(40, 0))

        # Result area
        self.result_frame = ctk.CTkFrame(container, fg_color="transparent")
        self.result_frame.grid(row=7, pady=16)
        self.result_label = ctk.CTkLabel(
            self.result_frame, text="",
            font=ctk.CTkFont(family="Segoe UI", size=18),
            text_color=TEXT_MUTED, wraplength=700, justify="center",
        )
        self.result_label.pack()

    def _set_result(self, text: str, color: str = TEXT_MUTED):
        self.result_label.configure(text=text, text_color=color)

    def _request_checkin(self):
        self._show_input("Enter Resident ID:", callback=self._do_checkin)

    def _do_checkin(self, resident_id: str):
        self._set_result(f"Checking in resident {resident_id}...", color=TEAL_LIGHT)
        try:
            # Get today's appointment
            import httpx
            client = httpx.Client(timeout=10.0)
            api = APIClient()
            apt = api.get_today_appointment(resident_id)
            if apt:
                ok = api.check_in_appointment(apt["id"], -1)
                if ok:
                    self._set_result(f"✅  Check-in successful!\n{apt.get('service_name', '')} @ {apt.get('start_time', '')}", color=GREEN_ACCENT)
                else:
                    self._set_result("❌  Check-in failed.", color=RED_ACCENT)
            else:
                self._set_result("ℹ️  No appointment found for today.", color=AMBER_ACCENT)
        except Exception as e:
            self._set_result(f"❌  Error: {e}", color=RED_ACCENT)

    def _view_today(self):
        self._set_result("Fetching today's appointments...", color=TEAL_LIGHT)
        try:
            api = APIClient()
            from datetime import date
            today = date.today().isoformat()
            resp = api.client.get(
                f"{api.base_url}/appointments/",
                params={"date_filter": today},
                headers=api._headers(),
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                if items:
                    lines = [f"📋  Today's Appointments ({len(items)}):"]
                    for a in items[:8]:
                        lines.append(f"• #{a.get('queue_number','?')} — {a.get('service_name','?')} @ {a.get('start_time','?')}")
                    self._set_result("\n".join(lines), color=WHITE)
                else:
                    self._set_result("No appointments today.", color=AMBER_ACCENT)
            else:
                self._set_result(f"API error: {resp.status_code}", color=RED_ACCENT)
        except Exception as e:
            self._set_result(f"❌  Error: {e}", color=RED_ACCENT)

    def _lookup_resident(self):
        self._show_input("Enter Resident ID or Name:", callback=self._do_lookup)

    def _do_lookup(self, query: str):
        self._set_result(f"Looking up \"{query}\"...", color=TEAL_LIGHT)
        try:
            api = APIClient()
            resp = api.client.get(
                f"{api.base_url}/residents/",
                params={"search": query},
                headers=api._headers(),
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                if items:
                    r = items[0]
                    self._set_result(
                        f"👤  {r.get('first_name','')} {r.get('last_name','')}\n"
                        f"ID: {r.get('id','?')}\n"
                        f"Contact: {r.get('contact_number','N/A')}",
                        color=WHITE)
                else:
                    self._set_result("No resident found.", color=AMBER_ACCENT)
            else:
                self._set_result(f"API error: {resp.status_code}", color=RED_ACCENT)
        except Exception as e:
            self._set_result(f"❌  Error: {e}", color=RED_ACCENT)

    def _show_input(self, prompt: str, callback):
        """Quick inline input dialog."""
        dialog = ctk.CTkToplevel(self)
        dialog.title("")
        dialog.geometry("500x300")
        dialog.configure(fg_color=SURFACE)
        dialog.attributes("-topmost", True)

        ctk.CTkLabel(dialog, text=prompt,
                     font=ctk.CTkFont(size=20, weight="bold"),
                     text_color=WHITE).pack(pady=(30, 16))

        entry = ctk.CTkEntry(dialog, width=360, height=50,
                             font=ctk.CTkFont(size=24),
                             fg_color=CARD, text_color=WHITE,
                             border_color=TEAL_PRIMARY)
        entry.pack(pady=8)
        entry.focus()

        def submit():
            val = entry.get().strip()
            if val:
                dialog.destroy()
                callback(val)

        ctk.CTkButton(dialog, text="✓  Submit",
                      command=submit,
                      fg_color=TEAL_PRIMARY, hover_color=TEAL_LIGHT,
                      width=200, height=48,
                      font=ctk.CTkFont(size=18, weight="bold"),
                      ).pack(pady=16)

        ctk.CTkButton(dialog, text="Cancel",
                      command=dialog.destroy,
                      fg_color="transparent", text_color=TEXT_MUTED,
                      hover_color=CARD, width=160, height=40,
                      font=ctk.CTkFont(size=16),
                      ).pack()

        # Enter key to submit
        entry.bind("<Return>", lambda e: submit())
        # Center on parent
        dialog.transient(self)
        dialog.grab_set()