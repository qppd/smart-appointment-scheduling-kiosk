"""
OTPEnrollScreen — Self-service fingerprint enrollment using a one-time code.
User enters the 6-digit OTP from their web app appointment. The kiosk
validates it against Firebase and then proceeds to fingerprint enrollment.
"""

import threading
import time
from typing import Callable, Optional, Any
import customtkinter as ctk
from gui.config import (
    PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT,
    BG, BG_SECONDARY, CARD_BORDER, CARD_BORDER_LIGHT,
    TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, TEXT_WHITE,
    SUCCESS, ERROR, s, font_tuple, to_12_hour,
)


class OTPEnrollScreen(ctk.CTkFrame):
    def __init__(self, master, firebase_service,
                 on_proceed: Callable[[dict], Any],
                 on_cancel: Callable[[], Any],
                 **kwargs):
        super().__init__(master, fg_color=BG, **kwargs)
        self.firebase = firebase_service
        self.on_proceed = on_proceed
        self.on_cancel = on_cancel
        self._otp = ""
        self._matched_appointment: Optional[dict] = None
        self._running = True
        self._build_ui()

    def reset(self):
        self._otp = ""
        self._matched_appointment = None
        self._otp_display.configure(text="_____", text_color=TEXT_MUTED)
        self._error_label.configure(text="")
        self._status_label.configure(text="Enter your 6-digit code", text_color=TEXT_SECONDARY)
        self._result_frame.pack_forget()

    def _build_ui(self):
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        container = ctk.CTkFrame(self, fg_color="transparent")
        container.place(relx=0.5, rely=0.5, anchor="center")

        # Title
        ctk.CTkLabel(container, text="Enroll Fingerprint",
                     font=font_tuple("heading"), text_color=TEXT_PRIMARY).pack(pady=(0, s(8)))
        self._status_label = ctk.CTkLabel(container, text="Enter your 6-digit code",
                                          font=font_tuple("body"), text_color=TEXT_SECONDARY)
        self._status_label.pack(pady=(0, s(24)))

        # OTP Display
        self._otp_display = ctk.CTkLabel(container, text="_____",
                                         font=("Inter", max(8, round(36 * 1.0)), "bold"),
                                         text_color=PRIMARY)
        self._otp_display.pack(pady=(0, s(24)))

        # Numpad
        self._numpad_frame = ctk.CTkFrame(container, fg_color="transparent")
        self._numpad_frame.pack(pady=(0, s(24)))
        self._build_numpad(self._numpad_frame)

        # Action buttons
        self._btn_frame = ctk.CTkFrame(container, fg_color="transparent")
        self._btn_frame.pack(pady=(0, s(16)))
        ctk.CTkButton(self._btn_frame, text="Cancel",
                      font=font_tuple("body"), fg_color="transparent",
                      text_color=TEXT_SECONDARY, hover_color=BG_SECONDARY,
                      height=s(44), width=s(140), corner_radius=s(8),
                      command=self._on_cancel).pack(side="left", padx=s(8))
        self._verify_btn = ctk.CTkButton(self._btn_frame, text="Verify",
                                         font=font_tuple("body_bold"), fg_color=PRIMARY,
                                         hover_color=PRIMARY_DARK, height=s(44), width=s(140),
                                         corner_radius=s(8), command=self._on_verify)
        self._verify_btn.pack(side="left", padx=s(8))

        # Error
        self._error_label = ctk.CTkLabel(container, text="", font=font_tuple("small"),
                                          text_color=ERROR)
        self._error_label.pack(pady=(s(8), 0))

        # Result area (hidden until OTP is validated)
        self._result_frame = ctk.CTkFrame(container, fg_color=BG, border_width=1,
                                          border_color=CARD_BORDER, corner_radius=s(12))
        self._result_frame.pack(pady=(s(16), 0))
        self._result_frame.pack_forget()

        ctk.CTkLabel(self._result_frame, text="Appointment Found",
                     font=font_tuple("body_bold"), text_color=TEXT_PRIMARY).pack(pady=(s(12), s(4)), padx=s(16))
        self._result_name = ctk.CTkLabel(self._result_frame, text="",
                                          font=font_tuple("body"), text_color=TEXT_SECONDARY)
        self._result_name.pack(pady=(0, s(2)), padx=s(16))
        self._result_service = ctk.CTkLabel(self._result_frame, text="",
                                             font=font_tuple("small"), text_color=TEXT_MUTED)
        self._result_service.pack(pady=(0, s(12)), padx=s(16))
        ctk.CTkButton(self._result_frame, text="Proceed to Enroll",
                      font=font_tuple("body_bold"), fg_color=PRIMARY, hover_color=PRIMARY_DARK,
                      height=s(44), corner_radius=s(10), command=self._on_proceed).pack(padx=s(16), pady=(0, s(12)))

    def _build_numpad(self, parent):
        digits = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['Clear', '0', 'Backspace']
        ]
        for row_idx, row in enumerate(digits):
            row_frame = ctk.CTkFrame(parent, fg_color="transparent")
            row_frame.pack(pady=s(4))
            for col in row:
                if col in ('Clear', 'Backspace'):
                    text = 'C' if col == 'Clear' else '←'
                    command = self._on_clear if col == 'Clear' else self._on_backspace
                    btn = ctk.CTkButton(row_frame, text=text, font=font_tuple("body_bold"),
                                        fg_color=BG_SECONDARY, text_color=TEXT_SECONDARY,
                                        hover_color=CARD_BORDER_LIGHT, height=s(52), width=s(70),
                                        corner_radius=s(8), command=command)
                else:
                    btn = ctk.CTkButton(row_frame, text=col, font=font_tuple("body_bold"),
                                        fg_color=BG, text_color=TEXT_PRIMARY,
                                        border_width=1, border_color=CARD_BORDER,
                                        hover_color=BG_SECONDARY, height=s(52), width=s(70),
                                        corner_radius=s(8), command=lambda c=col: self._on_digit(c))
                btn.pack(side="left", padx=s(4))

    def _on_digit(self, d: str):
        if len(self._otp) < 6:
            self._otp += d
            self._update_display()

    def _on_backspace(self):
        if self._otp:
            self._otp = self._otp[:-1]
            self._update_display()

    def _on_clear(self):
        self._otp = ""
        self._update_display()

    def _update_display(self):
        if not self._otp:
            self._otp_display.configure(text="_____", text_color=TEXT_MUTED)
        else:
            display = self._otp + "_" * (6 - len(self._otp))
            self._otp_display.configure(text=display, text_color=PRIMARY)

    def _on_verify(self):
        if len(self._otp) != 6:
            self._error_label.configure(text="Please enter all 6 digits.")
            return
        self._error_label.configure(text="")
        self._status_label.configure(text="Verifying...", text_color=PRIMARY)
        threading.Thread(target=self._do_verify, daemon=True).start()

    def _do_verify(self):
        try:
            from datetime import datetime, timezone
            today_local = datetime.now().strftime("%Y-%m-%d")
            today_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            all_appts = self.firebase.get_child("appointments") or {}
            matched = None
            matched_uid = None
            for apt_id, apt in all_appts.items():
                if not isinstance(apt, dict):
                    continue
                apt_otp = str(apt.get("enrollment_otp", ""))
                apt_date = apt.get("appointment_date", "")
                apt_status = apt.get("status", "")
                # Match OTP exactly, and date (allow local or UTC date)
                if (apt_otp == self._otp
                        and apt_status == "scheduled"
                        and (apt_date == today_local or apt_date == today_utc)):
                    # Check expiry - be lenient with timezone issues
                    exp = apt.get("enrollment_otp_expires_at")
                    if exp:
                        try:
                            exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
                            now_utc = datetime.now(timezone.utc)
                            # Add 1 hour buffer for timezone issues
                            if exp_dt < now_utc:
                                print(f"[OTP] Expired: {exp_dt} < {now_utc}")
                                continue
                        except (ValueError, TypeError):
                            pass
                    # Check already consumed
                    if apt.get("enrollment_otp_consumed_at"):
                        continue
                    matched = dict(apt)
                    matched["id"] = apt_id
                    matched_uid = apt.get("resident_id")
                    break

            if not matched:
                print(f"[OTP] No match for OTP={self._otp}, today_local={today_local}, today_utc={today_utc}")
                self.after(0, lambda: self._error_label.configure(
                    text="Invalid or expired code. Check your My Appointments page."))
                self.after(0, lambda: self._status_label.configure(
                    text="Enter your 6-digit code", text_color=TEXT_SECONDARY))
                return

            # Check if already enrolled
            user_data = self.firebase.get_child(f"users/{matched_uid}") or {}
            already = bool(user_data.get("fingerprint_enrolled"))
            if already:
                self.after(0, lambda: self._error_label.configure(
                    text="You've already enrolled your fingerprint. Tap to check in."))
                return

            self._matched_appointment = matched
            self.after(0, self._show_result)

        except Exception as e:
            import traceback
            traceback.print_exc()
            self.after(0, lambda: self._error_label.configure(text=f"Error: {e}"))

    def _show_result(self):
        if not self._matched_appointment:
            return
        self._result_name.configure(
            text=f"{self._matched_appointment.get('service_name', 'Appointment')} "
                 f"on {self._matched_appointment.get('appointment_date', '')} "
                 f"at {to_12_hour(self._matched_appointment.get('start_time', ''))}")
        self._result_service.configure(
            text=f"Resident: {self._matched_appointment.get('resident_first_name', '')} "
                 f"{self._matched_appointment.get('resident_last_name', '')}")
        self._result_frame.pack(pady=(s(16), 0))
        self._status_label.configure(text="Verified! Proceed to enroll.", text_color=SUCCESS)

    def _on_proceed(self):
        if self._matched_appointment:
            self._result_frame.pack_forget()
            self.on_proceed(self._matched_appointment)

    def _on_cancel(self):
        self.reset()
        self.on_cancel()
