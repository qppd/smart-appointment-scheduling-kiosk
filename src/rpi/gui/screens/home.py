"""
HomeScreen — Kiosk welcome dashboard with queue display.
Shows today's appointments, fingerprint check-in button, and status bar.
"""

import tkinter as tk
from datetime import datetime
from typing import Callable, Optional
import customtkinter as ctk
from gui.config import (
    PRIMARY, PRIMARY_DARK, PRIMARY_DEEP, PRIMARY_LIGHT, PRIMARY_50, ACCENT,
    BG, BG_SECONDARY, BG_GRAY, CARD_BORDER, CARD_BORDER_LIGHT,
    TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, TEXT_WHITE,
    SUCCESS, SUCCESS_BG, ERROR, ERROR_BG, WARNING, WARNING_BG,
    s, font_tuple, to_12_hour,
)


class HomeScreen(ctk.CTkFrame):
    def __init__(self, master: ctk.CTk, on_verify: Callable,
                 on_admin: Callable, on_enroll: Callable = None, **kwargs):
        super().__init__(master, fg_color=BG, **kwargs)
        self.on_verify = on_verify
        self.on_admin = on_admin
        self.on_enroll = on_enroll
        self.appointments = []
        self.esp_connected = False
        self.firebase_connected = False
        self._long_press_id = None
        self._queue_cards = {}  # queue_number -> card widget
        self._build_ui()

    # ── Public API ───────────────────────────────────────────────

    def update_appointments(self, appointments: list):
        self.appointments = appointments
        self._refresh_stats()
        self._refresh_queue()

    def update_esp_status(self, connected: bool):
        self.esp_connected = connected
        self._refresh_status_bar()

    def update_firebase_status(self, connected: bool):
        self.firebase_connected = connected
        self._refresh_status_bar()

    def _refresh_all(self):
        """Re-apply fonts/scale after a resize event."""
        pass  # Legacy — see rescale()

    def rescale(self):
        """Apply current scale to fonts and widget sizes (live resize)."""
        try:
            if hasattr(self, "_date_label"):
                self._date_label.place(x=s(16), y=s(8))
        except Exception:
            pass

        try:
            self._resize_header(self._header)
        except Exception:
            pass

        try:
            self._resize_status(self._status)
        except Exception:
            pass

        # Refresh widgets that draw fresh from scale on each call
        self._refresh_queue()
        self._refresh_stats()
        self._refresh_status_bar()

    # ── UI Build ─────────────────────────────────────────────────

    def _build_ui(self):
        self.grid_rowconfigure(2, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # ── Header — uses .rowconfigure weight instead of fixed height ──
        header = ctk.CTkFrame(self, fg_color=PRIMARY, corner_radius=0)
        header.grid(row=0, column=0, sticky="ew")
        header.grid_propagate(False)
        self._header = header
        # Fixed height scaled to current window
        self.after(50, lambda: self._resize_header(header))

        logo_frame = ctk.CTkFrame(header, fg_color="transparent")
        logo_frame.place(relx=0.5, rely=0.5, anchor="center")

        ctk.CTkLabel(logo_frame, text="Barangay Dolores",
                     font=font_tuple("title"), text_color=TEXT_WHITE).pack()
        ctk.CTkLabel(logo_frame, text="Smart Appointment Kiosk",
                     font=font_tuple("subheading"), text_color=PRIMARY_LIGHT).pack()

        self._date_label = ctk.CTkLabel(
            header, text="", font=font_tuple("small_bold"), text_color=PRIMARY_LIGHT)
        self._date_label.place(x=s(16), y=s(8))

        # ── Main content — 2-column: fingerprint | stats+queue ──
        content = ctk.CTkFrame(self, fg_color=BG)
        content.grid(row=2, column=0, sticky="nsew", padx=s(24), pady=(s(12), 0))
        content.grid_rowconfigure(0, weight=1)
        content.grid_columnconfigure(0, weight=0)
        content.grid_columnconfigure(1, weight=1)

        # Left — fingerprint button (scaled)
        left = ctk.CTkFrame(content, fg_color="transparent")
        left.grid(row=0, column=0, sticky="nsew", padx=(0, s(20)))
        left.grid_rowconfigure(0, weight=1)

        # Use a Frame (not Button) so internal widgets don't swallow click events
        self._fingerprint_btn = ctk.CTkFrame(
            left, fg_color="transparent", corner_radius=s(24),
            border_width=s(2), border_color=CARD_BORDER,
            width=s(280), height=s(260), cursor="hand2",
        )
        self._fingerprint_btn.grid(row=0, column=0, pady=(0, s(10)))
        self._fingerprint_btn.grid_propagate(False)

        btn_inner = ctk.CTkFrame(self._fingerprint_btn, fg_color="transparent")
        btn_inner.place(relx=0.5, rely=0.5, anchor="center")

        icon_sz = s(80)
        self._fp_canvas = tk.Canvas(
            btn_inner, width=icon_sz, height=icon_sz,
            highlightthickness=0)
        self._fp_canvas.configure(bg=BG)
        self._fp_canvas.pack(pady=(0, s(8)))
        self._draw_fingerprint_icon(self._fp_canvas, PRIMARY, icon_sz)

        self._fp_title = ctk.CTkLabel(
            btn_inner, text="Tap to Check In",
            font=font_tuple("heading"), text_color=PRIMARY)
        self._fp_title.pack()
        self._fp_subtitle = ctk.CTkLabel(
            btn_inner, text="Place your finger on the scanner",
            font=font_tuple("small"), text_color=TEXT_MUTED)
        self._fp_subtitle.pack()

        # Self-service enrollment link (below check-in)
        if self.on_enroll:
            self._enroll_link = ctk.CTkButton(
                left, text="New here? Enroll your fingerprint",
                font=font_tuple("small"), text_color=PRIMARY,
                fg_color="transparent", hover_color=PRIMARY_50,
                height=s(36), corner_radius=s(8),
                command=self._on_enroll_link)
            self._enroll_link.grid(row=1, column=0, pady=(0, 0))

        # Recursive click binding + manual hover effect
        def _click_fp(_e=None):
            self.on_verify()
            return "break"

        def _bind_fp_clicks(w):
            w.bind("<Button-1>", _click_fp)
            for child in w.winfo_children():
                _bind_fp_clicks(child)

        _bind_fp_clicks(self._fingerprint_btn)

        self._fingerprint_btn.bind(
            "<Enter>",
            lambda e: self._fingerprint_btn.configure(fg_color=BG_SECONDARY))
        self._fingerprint_btn.bind(
            "<Leave>",
            lambda e: self._fingerprint_btn.configure(fg_color="transparent"))

        # Right — stats + queue
        right = ctk.CTkFrame(content, fg_color="transparent")
        right.grid(row=0, column=1, sticky="nsew")
        right.grid_rowconfigure(2, weight=1)

        # Stats row
        stats_frame = ctk.CTkFrame(right, fg_color=BG, corner_radius=0)
        stats_frame.grid(row=0, column=0, sticky="ew", pady=(0, s(10)))
        stats_frame.grid_columnconfigure(0, weight=1)
        stats_frame.grid_columnconfigure(1, weight=1)

        f32 = ("Inter", max(8, round(32 * 1.0)), "bold")  # static ref size, but let's use s()
        self._stat_appts = self._stat_card(stats_frame, "Today's Appointments", "0", 0, PRIMARY, f32)
        self._stat_checked = self._stat_card(stats_frame, "Checked In", "0", 1, SUCCESS, f32)

        # Queue header
        queue_header = ctk.CTkFrame(right, fg_color="transparent")
        queue_header.grid(row=1, column=0, sticky="ew", pady=(0, s(6)))
        ctk.CTkLabel(queue_header, text="Today's Queue",
                     font=font_tuple("heading"), text_color=TEXT_PRIMARY).pack(side="left")
        self._queue_count = ctk.CTkLabel(
            queue_header, text="", font=font_tuple("small"), text_color=TEXT_MUTED)
        self._queue_count.pack(side="left", padx=(s(8), 0))

        # Queue list (scrollable, fills all remaining vertical space)
        self._queue_container = ctk.CTkScrollableFrame(
            right, fg_color="transparent", scrollbar_button_color=PRIMARY,
            scrollbar_button_hover_color=PRIMARY_DARK)
        self._queue_container.grid(row=2, column=0, sticky="nsew")

        ctk.CTkLabel(self._queue_container, text="No appointments today",
                     font=font_tuple("body"), text_color=TEXT_MUTED).pack(pady=s(20))

        # ── Status bar ──
        status = ctk.CTkFrame(self, fg_color=BG_SECONDARY,
                              corner_radius=0)
        status.grid(row=3, column=0, sticky="ew")
        status.grid_propagate(False)
        self._status = status
        self.after(100, lambda: self._resize_status(status))
        status.grid_columnconfigure(0, weight=1)
        status.grid_columnconfigure(1, weight=1)

        self._esp_status = ctk.CTkLabel(
            status, text="● ESP32: Checking...", font=font_tuple("tiny"),
            text_color=TEXT_MUTED, anchor="w")
        self._esp_status.grid(row=0, column=0, sticky="w", padx=s(16))

        self._fb_status = ctk.CTkLabel(
            status, text="● Firebase: Checking...", font=font_tuple("tiny"),
            text_color=TEXT_MUTED, anchor="e")
        self._fb_status.grid(row=0, column=1, sticky="e", padx=s(16))

        # Admin long-press area — use Frame so inner label doesn't swallow events
        admin_btn = ctk.CTkFrame(
            status, fg_color=BG_SECONDARY, corner_radius=s(6),
            width=s(80), height=s(28), cursor="hand2",
            border_width=1, border_color=CARD_BORDER_LIGHT,
        )
        admin_btn.place(relx=0.5, rely=0.5, anchor="center")
        admin_btn.grid_propagate(False)
        admin_btn.lift()

        admin_label = ctk.CTkLabel(
            admin_btn, text="Admin", font=font_tuple("tiny"),
            text_color=TEXT_SECONDARY)
        admin_label.place(relx=0.5, rely=0.5, anchor="center")

        def _admin_press(_e=None):
            self._start_long_press(None)
            return "break"

        def _admin_release(_e=None):
            self._cancel_long_press(None)
            return "break"

        def _bind_admin_clicks(w):
            w.bind("<ButtonPress-1>", _admin_press)
            w.bind("<ButtonRelease-1>", _admin_release)
            for child in w.winfo_children():
                _bind_admin_clicks(child)

        _bind_admin_clicks(admin_btn)

        admin_btn.bind(
            "<Enter>", lambda e: admin_btn.configure(fg_color=PRIMARY_50))
        admin_btn.bind(
            "<Leave>", lambda e: admin_btn.configure(fg_color=BG_SECONDARY))
        admin_label.configure(text_color=TEXT_PRIMARY)

    def _resize_header(self, header):
        """Set header height to ~15% of window height."""
        try:
            h = self.winfo_height()
            if h > 50:
                header.configure(height=max(s(80), h // 6))
        except Exception:
            pass

    def _resize_status(self, status):
        """Set status bar height scaled."""
        try:
            status.configure(height=s(32))
        except Exception:
            pass

    # ── Helpers ──

    def _stat_card(self, parent: ctk.CTkFrame, label: str,
                   value: str, col: int, color: str, f32) -> ctk.CTkFrame:
        frame = ctk.CTkFrame(parent, fg_color=BG, border_width=1,
                             border_color=CARD_BORDER_LIGHT, corner_radius=s(12))
        frame.grid(row=0, column=col, sticky="ew", padx=s(4))
        val_font = ("Inter", max(8, round(32 * 1.0)), "bold")
        ctk.CTkLabel(frame, text=value, font=val_font,
                     text_color=color).pack(pady=(s(10), s(2)))
        ctk.CTkLabel(frame, text=label, font=font_tuple("small"),
                     text_color=TEXT_SECONDARY).pack(pady=(0, s(10)))
        return frame

    def _update_date(self):
        now = datetime.now()
        self._date_label.configure(
            text=now.strftime("%A, %B %d, %Y").upper())
        self.after(60000, self._update_date)

    def _refresh_stats(self):
        total = len(self.appointments)
        checked = sum(1 for a in self.appointments
                      if a.get("status") == "checked_in")
        self._stat_appts.winfo_children()[0].configure(text=str(total))
        self._stat_checked.winfo_children()[0].configure(text=str(checked))
        self._queue_count.configure(
            text=f"— {len(self.appointments)} total")

    def _refresh_queue(self):
        # Build map of queue_number -> appointment
        new_appointments = {a.get("queue_number"): a for a in self.appointments}
        existing_numbers = set(self._queue_cards.keys())
        new_numbers = set(new_appointments.keys())

        # Remove cards that are no longer in appointments
        for qn in existing_numbers - new_numbers:
            card = self._queue_cards.pop(qn)
            card.destroy()

        # Update or create cards for each appointment
        for qn in sorted(new_numbers):
            a = new_appointments[qn]
            if qn in self._queue_cards:
                self._update_queue_card(self._queue_cards[qn], a)
            else:
                self._queue_cards[qn] = self._create_queue_card(a)

        # If no appointments, show empty state
        if not self.appointments and not hasattr(self, "_empty_label"):
            self._empty_label = ctk.CTkLabel(
                self._queue_container, text="No appointments today",
                font=font_tuple("body"), text_color=TEXT_MUTED)
            self._empty_label.pack(pady=s(20))
        elif self.appointments and hasattr(self, "_empty_label"):
            self._empty_label.destroy()
            del self._empty_label

    def _create_queue_card(self, a: dict):
        """Create a new queue card and return it."""
        status_colors = {
            "scheduled": (WARNING_BG, WARNING),
            "checked_in": (SUCCESS_BG, SUCCESS),
            "completed": (BG_SECONDARY, TEXT_MUTED),
            "cancelled": (ERROR_BG, ERROR),
        }
        sbg, sfg = status_colors.get(a.get("status", "scheduled"),
                                      (BG_SECONDARY, TEXT_MUTED))

        card = ctk.CTkFrame(self._queue_container, fg_color=BG,
                            border_width=1, border_color=CARD_BORDER_LIGHT,
                            corner_radius=s(10))
        card.pack(fill="x", pady=s(3))
        card.grid_columnconfigure(3, weight=1)

        qn = a.get("queue_number", "?")
        qn_label = ctk.CTkLabel(card, text=f"#{qn}",
                     font=("Inter", max(8, round(20 * 1.0)), "bold"),
                     text_color=TEXT_PRIMARY,
                     width=s(60))
        qn_label.grid(row=0, column=0, padx=(s(12), s(8)), pady=s(10))

        name = f"{a.get('resident_first_name', '')} {a.get('resident_last_name', '')}".strip()
        display_name = name or a.get("resident_id", "Unknown")[:8]
        name_label = ctk.CTkLabel(card, text=display_name, font=font_tuple("body_bold"),
                     text_color=TEXT_PRIMARY)
        name_label.grid(row=0, column=1, padx=s(4))

        service_label = ctk.CTkLabel(card, text=a.get("service_name", ""),
                     font=font_tuple("small"), text_color=TEXT_SECONDARY)
        service_label.grid(row=0, column=2, padx=s(8))

        time_frame = ctk.CTkFrame(card, fg_color="transparent")
        time_frame.grid(row=0, column=3, sticky="e", padx=s(12))
        time_label = ctk.CTkLabel(time_frame, text=to_12_hour(a.get("start_time", "--")),
                     font=font_tuple("small"), text_color=TEXT_MUTED)
        time_label.pack(side="left", padx=(0, s(8)))

        status_label = ctk.CTkLabel(time_frame, text=a.get("status", ""),
                     font=font_tuple("tiny"), text_color=sfg,
                     fg_color=sbg, corner_radius=s(8))
        status_label.pack(side="left", padx=s(2))

        # Store references for later updates
        card._status_label = status_label
        card._status_bg = sbg
        card._status_fg = sfg
        card._time_label = time_label
        card._name_label = name_label
        card._service_label = service_label
        card._qn_label = qn_label

        return card

    def _update_queue_card(self, card, a: dict):
        """Update an existing queue card with new appointment data."""
        status_colors = {
            "scheduled": (WARNING_BG, WARNING),
            "checked_in": (SUCCESS_BG, SUCCESS),
            "completed": (BG_SECONDARY, TEXT_MUTED),
            "cancelled": (ERROR_BG, ERROR),
        }
        sbg, sfg = status_colors.get(a.get("status", "scheduled"),
                                      (BG_SECONDARY, TEXT_MUTED))

        # Update labels in place
        name = f"{a.get('resident_first_name', '')} {a.get('resident_last_name', '')}".strip()
        display_name = name or a.get("resident_id", "Unknown")[:8]

        card._name_label.configure(text=display_name)
        card._service_label.configure(text=a.get("service_name", ""))
        card._time_label.configure(text=to_12_hour(a.get("start_time", "--")))
        card._status_label.configure(text=a.get("status", ""), text_color=sfg, fg_color=sbg)

        # Update stored colors
        card._status_bg = sbg
        card._status_fg = sfg

    def _on_enroll_link(self):
        if self.on_enroll:
            self.on_enroll()

    def _refresh_status_bar(self):
        esp_color = SUCCESS if self.esp_connected else ERROR
        esp_text = f"● ESP32: {'Connected' if self.esp_connected else 'Disconnected'}"
        self._esp_status.configure(text=esp_text, text_color=esp_color)

        fb_color = SUCCESS if self.firebase_connected else ERROR
        fb_text = f"● Firebase: {'Connected' if self.firebase_connected else 'Disconnected'}"
        self._fb_status.configure(text=fb_text, text_color=fb_color)

    # ── Long-press -> Admin ──

    def _start_long_press(self, event):
        self._cancel_long_press(None)
        self._long_press_id = self.after(2000, self._trigger_admin)

    def _cancel_long_press(self, event):
        if self._long_press_id:
            self.after_cancel(self._long_press_id)
            self._long_press_id = None

    def _trigger_admin(self):
        self._long_press_id = None
        self.on_admin()

    def _draw_fingerprint_icon(self, canvas, color: str,
                               canvas_size: int = 80):
        """Draw a scaled fingerprint icon."""
        cx = cy = canvas_size // 2
        r = canvas_size * 30 // 80
        w1 = max(1, canvas_size * 3 // 80)
        w2 = max(1, canvas_size * 2 // 80)

        canvas.create_arc(cx - r, cy - r, cx + r, cy + r,
                          start=20, extent=140, width=w1,
                          outline=color, style="arc")
        inner = r * 3 // 4
        canvas.create_arc(cx - inner, cy - inner, cx + inner, cy + inner,
                          start=20, extent=140, width=w2,
                          outline=color, style="arc")
        dot = max(1, canvas_size * 3 // 80)
        canvas.create_oval(cx - dot, cy - dot, cx + dot, cy + dot,
                           fill=color, outline="")
        for i in range(3):
            off = (i + 1) * (canvas_size // 10)
            dx = off
            dy = canvas_size // 16
            canvas.create_line(cx + off, cy - dy, cx + off + 6, cy - dy - 4,
                               width=w2, fill=color, capstyle="round")
            canvas.create_line(cx - off, cy - dy, cx - off - 6, cy - dy - 4,
                               width=w2, fill=color, capstyle="round")