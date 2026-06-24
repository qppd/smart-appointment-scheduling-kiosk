"""
EnrollScreen — Self-service fingerprint enrollment from the landing page.
User taps their unenrolled appointment card → comes here.
No PIN/admin needed. Auto-selects the next free template slot.
"""

import tkinter as tk
import threading
import time
from typing import Optional
import customtkinter as ctk
from gui.config import (
    PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT,
    BG, BG_SECONDARY, CARD_BORDER,
    TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, TEXT_WHITE,
    SUCCESS, SUCCESS_BG, ERROR, ERROR_BG, WARNING,
    s, font_tuple,
)


class EnrollScreen(ctk.CTkFrame):
    def __init__(self, master, serial_handler, firebase_service,
                 on_complete: callable, on_cancel: callable,
                 on_user_changed: callable | None = None, **kwargs):
        super().__init__(master, fg_color=BG, **kwargs)
        self.serial_handler = serial_handler
        self.firebase = firebase_service
        self.on_complete = on_complete
        self.on_cancel = on_cancel
        self.on_user_changed = on_user_changed
        self._appointment = None
        self._running = False
        self._build_ui()

    def start_for(self, appt: dict):
        """Begin enrollment flow for the given appointment dict."""
        self._appointment = appt
        self._reset_state()
        self._status_text.configure(
            text=f"Welcome, {appt.get('resident_first_name', '')}!")
        self._instruction.configure(
            text="We need to enroll your fingerprint\nto enable fast check-in.")
        self._start_btn.configure(state="normal")
        self._running = True

    def _build_ui(self):
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        container = ctk.CTkFrame(self, fg_color="transparent")
        container.place(relx=0.5, rely=0.5, anchor="center")

        fp_sz = s(100)
        self._fp_canvas = tk.Canvas(
            container, width=fp_sz, height=fp_sz, highlightthickness=0)
        self._fp_canvas.configure(bg=BG)
        self._fp_canvas.pack(pady=(0, s(16)))
        self._draw_icon(fp_sz)

        self._status_text = ctk.CTkLabel(container, text="",
                                          font=font_tuple("heading"),
                                          text_color=TEXT_PRIMARY)
        self._status_text.pack(pady=(0, s(6)))

        self._instruction = ctk.CTkLabel(container, text="",
                                          font=font_tuple("body"),
                                          text_color=TEXT_SECONDARY)
        self._instruction.pack(pady=(0, s(24)))

        self._progress = ctk.CTkProgressBar(
            container, width=s(300), height=s(6),
            progress_color=PRIMARY, fg_color=BG_SECONDARY)
        self._progress.pack(pady=(0, s(8)))
        self._progress.set(0)

        self._step_label = ctk.CTkLabel(container, text="",
                                         font=font_tuple("small"),
                                         text_color=TEXT_MUTED)
        self._step_label.pack(pady=(0, s(20)))

        self._start_btn = ctk.CTkButton(
            container, text="Start Enrollment",
            font=font_tuple("body_bold"),
            fg_color=PRIMARY, hover_color=PRIMARY_DARK,
            height=s(50), width=s(240), corner_radius=s(25),
            command=self._on_start)
        self._start_btn.pack(pady=(0, s(10)))

        self._cancel_btn = ctk.CTkButton(
            container, text="Cancel",
            font=font_tuple("body"),
            fg_color="transparent", text_color=TEXT_SECONDARY,
            hover_color=BG_SECONDARY,
            height=s(40), width=s(120), corner_radius=s(20),
            command=self._on_cancel)
        self._cancel_btn.pack()

        self._error_label = ctk.CTkLabel(container, text="",
                                          font=font_tuple("small"),
                                          text_color=ERROR)
        self._error_label.pack(pady=(s(8), 0))

    def _draw_icon(self, sz):
        self._fp_canvas.delete("all")
        cx = cy = sz // 2
        w = max(1, sz // 28)
        r1 = sz * 35 // 100
        r2 = sz * 45 // 100
        self._fp_canvas.create_arc(cx - r2, cy - r2, cx + r2, cy + r2,
                                    start=15, extent=150, width=w,
                                    outline=PRIMARY, style="arc")
        self._fp_canvas.create_arc(cx - r1, cy - r1, cx + r1, cy + r1,
                                    start=15, extent=150, width=max(1, w-1),
                                    outline=PRIMARY_DARK, style="arc")
        d = max(1, sz // 25)
        self._fp_canvas.create_oval(cx - d, cy - d, cx + d, cy + d,
                                     fill=PRIMARY, outline="")

    def _reset_state(self):
        self._start_btn.configure(state="normal", text="Start Enrollment")
        self._progress.set(0)
        self._step_label.configure(text="")
        self._error_label.configure(text="")

    def _on_start(self):
        self._start_btn.configure(state="disabled", text="Connecting...")
        self._error_label.configure(text="")
        threading.Thread(target=self._do_enroll, daemon=True).start()

    def _on_cancel(self):
        self._running = False
        self._reset_state()
        self.on_cancel()

    def _do_enroll(self):
        appt = self._appointment
        if not appt:
            return

        # Defense-in-depth: refuse if user already has fingerprint enrolled
        uid = appt.get("resident_id")
        if uid and self.firebase:
            try:
                user_data = self.firebase.get_child(f"users/{uid}") or {}
                if bool(user_data.get("fingerprint_enrolled")):
                    self.after(0, lambda: self._error_label.configure(
                        text="Your fingerprint is already enrolled. Tap to check in."))
                    self.after(0, lambda: self._start_btn.configure(
                        state="normal", text="Start Enrollment"))
                    self.after(0, lambda: self._instruction.configure(
                        text="No further enrollment is needed."))
                    return
            except Exception as e:
                print(f"[ENROLL] User check error: {e}")

        # 1. Find free slot
        self.after(0, lambda: self._step_label.configure(
            text="Checking available slot..."))
        slot = self.serial_handler.find_free_slot()
        if slot < 1:
            self.after(0, lambda: self._error_label.configure(
                text="No free slots available. Contact staff."))
            self.after(0, lambda: self._start_btn.configure(
                state="normal", text="Try Again"))
            return

        # 2. Run enrollment
        self.after(0, lambda: self._step_label.configure(
            text="Place your finger on the scanner"))
        self.after(0, lambda: self._start_btn.configure(text="Enrolling..."))
        success, data = self.serial_handler.enroll_fingerprint(slot)

        if not success:
            self.after(0, lambda: self._error_label.configure(
                text=f"Enrollment failed: {data}"))
            self.after(0, lambda: self._start_btn.configure(
                state="normal", text="Try Again"))
            self.after(0, lambda: self._step_label.configure(text=""))
            return

        # 3. Save to Firebase
        self.after(0, lambda: self._step_label.configure(
            text="Saving to your profile..."))
        self._progress.set(0.8)
        uid = appt.get("resident_id")
        if uid and self.firebase:
            try:
                self.firebase.update_child(f"users/{uid}", {
                    "fingerprint_template_id": slot,
                    "fingerprint_enrolled": True,
                    "fingerprint_enrolled_at": int(time.time() * 1000),
                })
                # Invalidate the kiosk's in-process user cache so the
                # home queue reflects the new enrolled status on the
                # next polling tick instead of waiting up to 60 s for
                # the cache's natural refresh. Without this we keep
                # serving stale "not enrolled" entries.
                if self.on_user_changed:
                    try:
                        self.on_user_changed(uid, {
                            "fingerprint_template_id": slot,
                            "fingerprint_enrolled": True,
                        })
                    except Exception:
                        pass
                # Consume the OTP so it can't be reused
                appt_id = appt.get("id")
                if appt_id:
                    self.firebase.update_child(f"appointments/{appt_id}", {
                        "enrollment_otp_consumed_at": int(time.time() * 1000),
                    })
            except Exception as e:
                print(f"[ENROLL] Firebase update error: {e}")

        # 4. Success
        self.after(0, lambda: self._progress.set(1.0))
        self.after(0, lambda: self._step_label.configure(
            text="Fingerprint enrolled successfully!"))
        self.after(0, lambda: self._start_btn.configure(text="Done"))
        self.after(0, lambda: self._instruction.configure(
            text="You can now use fingerprint check-in."))
        self.after(0, lambda: self._status_text.configure(
            text="Enrollment Complete!", text_color=SUCCESS))

        time.sleep(1.5)
        self.after(0, lambda: self.on_complete(appt))