"""
ResultScreen — Shows check-in success or failure with appointment details.
"""

import tkinter as tk
from typing import Optional
import customtkinter as ctk
from gui.config import (
    PRIMARY, PRIMARY_DARK,
    BG, BG_SECONDARY, CARD_BORDER,
    TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED,
    SUCCESS, SUCCESS_BG, ERROR, ERROR_BG,
    s, font_tuple, RESULT_AUTO_RETURN, to_12_hour,
)

class ResultScreen(ctk.CTkFrame):
    def __init__(self, master: ctk.CTk, on_done: callable,
                 on_retry: callable, **kwargs):
        super().__init__(master, fg_color=BG, **kwargs)
        self.on_done = on_done
        self.on_retry = on_retry
        self._timer_id = None
        self._build_ui()

    # ── Public states ─────────────────────────────────────────────

    def show_success(self, data: dict):
        self._cancel_timer()
        self._reset_layout()

        self._icon_canvas.delete("all")
        self._draw_checkmark(SUCCESS)
        self._icon_frame.configure(fg_color=SUCCESS_BG)

        self._heading.configure(text="Check-in Successful!", text_color=SUCCESS)
        self._subheading.configure(
            text=f"Welcome, {data.get('name', 'Resident')}!",
            text_color=TEXT_PRIMARY, font=font_tuple("subheading"))

        card = ctk.CTkFrame(self._details_area, fg_color=BG,
                            border_width=s(1), border_color=CARD_BORDER,
                            corner_radius=s(14))
        card.pack(pady=s(8), padx=s(40), fill="x")

        row_data = [
            ("Queue Number", f"#{data.get('queue_number', '--')}"),
            ("Service", data.get("service_name", "--")),
            ("Time", to_12_hour(data.get("start_time", "--"))),
            ("Status", "Checked In"),
        ]
        for label, value in row_data:
            row = ctk.CTkFrame(card, fg_color="transparent")
            row.pack(fill="x", padx=s(20), pady=s(6))
            ctk.CTkLabel(row, text=label, font=font_tuple("small"),
                         text_color=TEXT_MUTED).pack(side="left")
            ctk.CTkLabel(row, text=value, font=font_tuple("body_bold"),
                         text_color=TEXT_PRIMARY).pack(side="right")

        self._action_btn.configure(
            text="Done", command=self._on_done, fg_color=SUCCESS,
            hover_color=PRIMARY_DARK)
        self._start_timer()

    def show_failure(self, reason: str = "Fingerprint not recognized"):
        self._cancel_timer()
        self._reset_layout()

        self._icon_canvas.delete("all")
        self._draw_x(ERROR)
        self._icon_frame.configure(fg_color=ERROR_BG)

        self._heading.configure(text="Verification Failed", text_color=ERROR)
        self._subheading.configure(
            text=reason, text_color=TEXT_SECONDARY, font=font_tuple("body"))

        ctk.CTkLabel(self._details_area,
                     text="Please try again or see the staff for assistance.",
                     font=font_tuple("small"), text_color=TEXT_MUTED
                     ).pack(pady=s(12))

        self._action_btn.configure(
            text="Try Again", command=self._on_retry, fg_color=PRIMARY,
            hover_color=PRIMARY_DARK)

    def show_error(self, message: str):
        self._cancel_timer()
        self._reset_layout()

        self._icon_canvas.delete("all")
        self._draw_x(ERROR)
        self._icon_frame.configure(fg_color=ERROR_BG)

        self._heading.configure(text="Error", text_color=ERROR)
        self._subheading.configure(
            text=message, text_color=TEXT_SECONDARY, font=font_tuple("body"))

        self._action_btn.configure(
            text="Go Back", command=self._on_done, fg_color=PRIMARY,
            hover_color=PRIMARY_DARK)

    def rescale(self):
        try:
            self._icon_frame.configure(width=s(110), height=s(110),
                                       corner_radius=s(55))
            self._icon_canvas.configure(width=s(110), height=s(110))
        except Exception:
            pass
        try:
            self._action_btn.configure(height=s(50), width=s(220),
                                       corner_radius=s(25))
        except Exception:
            pass

    # ── UI build ──────────────────────────────────────────────────

    def _build_ui(self):
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        container = ctk.CTkFrame(self, fg_color="transparent")
        container.place(relx=0.5, rely=0.45, anchor="center")

        # Icon circle
        self._icon_frame = ctk.CTkFrame(
            container, fg_color=BG_SECONDARY,
            width=s(110), height=s(110), corner_radius=s(55))
        self._icon_frame.pack(pady=(0, s(16)))
        self._icon_frame.pack_propagate(False)
        self._icon_canvas = tk.Canvas(
            self._icon_frame, width=s(110), height=s(110),
            highlightthickness=0, bg=BG_SECONDARY)
        self._icon_canvas.pack()

        # Heading
        self._heading = ctk.CTkLabel(container, text="",
                                     font=font_tuple("title"),
                                     text_color=TEXT_PRIMARY)
        self._heading.pack(pady=(0, s(4)))

        self._subheading = ctk.CTkLabel(container, text="",
                                        font=font_tuple("body"),
                                        text_color=TEXT_SECONDARY)
        self._subheading.pack(pady=(0, s(16)))

        # Dynamic details area
        self._details_area = ctk.CTkFrame(container, fg_color="transparent")
        self._details_area.pack(fill="x", pady=(0, s(20)))

        # Action button
        self._action_btn = ctk.CTkButton(
            container, text="", font=font_tuple("body_bold"),
            height=s(50), width=s(220), corner_radius=s(25))
        self._action_btn.pack()

    def _reset_layout(self):
        for w in self._details_area.winfo_children():
            w.destroy()
        self._icon_frame.configure(fg_color=BG_SECONDARY)

    def _on_done(self):
        self._cancel_timer()
        self.on_done()

    def _on_retry(self):
        self._cancel_timer()
        self.on_retry()

    def _start_timer(self):
        self._cancel_timer()
        self._timer_id = self.after(int(RESULT_AUTO_RETURN), self._on_done)

    def _cancel_timer(self):
        if self._timer_id:
            self.after_cancel(self._timer_id)
            self._timer_id = None

    def _draw_checkmark(self, color: str):
        c = self._icon_canvas
        sz = s(110)
        line_w = max(2, sz // 14)
        c.create_line(sz * 30 / 110, sz * 58 / 110,
                      sz * 48 / 110, sz * 78 / 110,
                      width=line_w, fill=color,
                      capstyle="round", joinstyle="round")
        c.create_line(sz * 48 / 110, sz * 78 / 110,
                      sz * 80 / 110, sz * 35 / 110,
                      width=line_w, fill=color,
                      capstyle="round", joinstyle="round")

    def _draw_x(self, color: str):
        c = self._icon_canvas
        sz = s(110)
        line_w = max(2, sz // 14)
        c.create_line(sz * 35 / 110, sz * 35 / 110,
                      sz * 75 / 110, sz * 75 / 110,
                      width=line_w, fill=color,
                      capstyle="round", joinstyle="round")
        c.create_line(sz * 75 / 110, sz * 35 / 110,
                      sz * 35 / 110, sz * 75 / 110,
                      width=line_w, fill=color,
                      capstyle="round", joinstyle="round")