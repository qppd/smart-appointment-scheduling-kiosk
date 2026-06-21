"""
VerifyScreen — Fingerprint scanning with real-time ESP32 feedback.
Displays pulsing animation while waiting for the scan, updates state from serial.
"""

import tkinter as tk
import math
import time
import threading
from typing import Callable, Optional
import customtkinter as ctk
from gui.config import (
    PRIMARY, PRIMARY_DARK, ACCENT,
    BG, BG_SECONDARY, CARD_BORDER,
    TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, TEXT_WHITE,
    SUCCESS, ERROR,
    s, font_tuple, VERIFY_TIMEOUT,
)


class VerifyScreen(ctk.CTkFrame):
    def __init__(self, master: ctk.CTk, serial_handler,
                 on_result: Callable, on_cancel: Callable, **kwargs):
        super().__init__(master, fg_color=BG, **kwargs)
        self.serial_handler = serial_handler
        self.on_result = on_result
        self.on_cancel = on_cancel
        self._running = False
        self._build_ui()

    def show(self):
        self._running = True
        self._status_text.configure(text="Place your finger on the scanner")
        self._status_label.configure(text="Waiting...")
        self._cancel_btn.configure(state="normal")
        self._progress.set(0)
        self._pulse()
        self._start_scan_thread()

    def hide(self):
        self._running = False

    def rescale(self):
        """Re-apply scale to canvas size and redraw animation."""
        try:
            fp_sz = s(140)
            self._fp_canvas.configure(width=fp_sz, height=fp_sz)
            self._fp_canvas.delete("all")
            self._draw_fingerprint(PRIMARY, fp_sz)
        except Exception:
            pass
        try:
            if hasattr(self, "_progress"):
                self._progress.configure(width=s(320), height=s(6))
            if hasattr(self, "_cancel_btn"):
                self._cancel_btn.configure(height=s(44), width=s(160),
                                           corner_radius=s(22))
        except Exception:
            pass

    def _build_ui(self):
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # Vertically centered container, scaled
        container = ctk.CTkFrame(self, fg_color=BG)
        container.place(relx=0.5, rely=0.45, anchor="center")

        # Animated fingerprint icon
        fp_sz = s(140)
        self._fp_canvas = tk.Canvas(
            container, width=fp_sz, height=fp_sz, highlightthickness=0)
        self._fp_canvas.configure(bg=BG)
        self._fp_canvas.pack(pady=(0, s(20)))
        self._draw_fingerprint(PRIMARY, fp_sz)

        # Status text
        self._status_text = ctk.CTkLabel(
            container, text="Place your finger on the scanner",
            font=font_tuple("heading"), text_color=TEXT_PRIMARY)
        self._status_text.pack(pady=(0, s(6)))

        self._status_label = ctk.CTkLabel(
            container, text="Waiting...",
            font=font_tuple("body"), text_color=TEXT_SECONDARY)
        self._status_label.pack(pady=(0, s(24)))

        # Progress bar
        self._progress = ctk.CTkProgressBar(
            container, width=s(320), height=s(6),
            progress_color=PRIMARY, fg_color=BG_SECONDARY)
        self._progress.pack(pady=(0, s(32)))
        self._progress.set(0)

        # Cancel button
        self._cancel_btn = ctk.CTkButton(
            container, text="Cancel", font=font_tuple("body"),
            fg_color="transparent", text_color=TEXT_SECONDARY,
            hover_color=BG_SECONDARY, border_width=s(1),
            border_color=CARD_BORDER,
            height=s(44), width=s(160), corner_radius=s(22),
            command=self._on_cancel)
        self._cancel_btn.pack()

        self._draw_fingerprint(PRIMARY, fp_sz)

    def _start_scan_thread(self):
        def scan():
            timeout_at = time.time() + (VERIFY_TIMEOUT / 1000)
            start = time.time()

            while self._running and time.time() < timeout_at:
                elapsed = time.time() - start
                pct = min(elapsed / (VERIFY_TIMEOUT / 1000), 0.95)
                self.after(0, lambda v=pct: self._progress.set(v))

                try:
                    matched, template_id = self.serial_handler.verify_fingerprint()
                except Exception as e:
                    self.after(0, lambda: self._status_text.configure(
                        text=f"Error: {e}"))
                    self.after(0, lambda: self._status_label.configure(
                        text="Try again"))
                    time.sleep(2)
                    continue

                if matched:
                    self.after(0, lambda: self._progress.set(1.0))
                    self.after(0, lambda: self._status_text.configure(
                        text="Fingerprint Matched!"))
                    self.after(0, lambda: self._status_label.configure(
                        text=f"Template ID: {template_id}"))
                    time.sleep(0.5)
                    self.after(0, lambda: self.on_result(True, template_id))
                    return
                elif "No match" in str(matched) or "NO_MATCH" in str(matched):
                    self.after(0, lambda: self._status_text.configure(
                        text="Fingerprint not recognized"))
                    self.after(0, lambda: self._status_label.configure(
                        text="Try again"))
                    time.sleep(1)
                    self.after(0, lambda: self.on_result(False, None))
                    return
                else:
                    time.sleep(0.2)

            # Timeout
            self.after(0, lambda: self._status_text.configure(
                text="Timed out"))
            self.after(0, lambda: self._status_label.configure(
                text="Please try again"))
            time.sleep(1)
            self.after(0, lambda: self.on_result(False, None, timeout=True))

        threading.Thread(target=scan, daemon=True).start()

    def _pulse(self):
        if not self._running:
            return
        t = time.time()
        r = s(20) + s(8) * math.sin(t * 3)
        self._fp_canvas.delete("pulse")
        fp_sz = s(140)
        cx = cy = fp_sz // 2
        self._fp_canvas.create_oval(
            cx - r, cy - r, cx + r, cy + r,
            outline=PRIMARY, width=s(1.5),
            dash=(s(4), s(4)), tags="pulse")
        self.after(50, self._pulse)

    def _on_cancel(self):
        self._running = False
        self.on_cancel()

    def _draw_fingerprint(self, color: str, canvas_size: int = 140):
        self._fp_canvas.delete("all")
        cx = cy = canvas_size // 2
        w = max(1, canvas_size * 4 // 140)
        r1 = canvas_size * 42 // 140
        r2 = canvas_size * 50 // 140

        for r in [r1, r2]:
            self._fp_canvas.create_arc(
                cx - r, cy - r, cx + r, cy + r,
                start=15, extent=150, width=w,
                outline=color, style="arc")

        dot = max(1, canvas_size * 4 // 140)
        self._fp_canvas.create_oval(cx - dot, cy - dot, cx + dot, cy + dot,
                                    fill=color, outline="")

        for dx, dy in [
            (-28, -10), (-18, -18), (-6, -24), (6, -24), (18, -18),
            (28, -10), (-28, 10), (-18, 18), (-6, 24), (6, 24),
            (18, 18), (28, 10),
        ]:
            sx = dx * canvas_size // 140
            sy = dy * canvas_size // 140
            angle = math.atan2(dy, dx)
            ex = sx + s(8) * math.cos(angle)
            ey = sy + s(8) * math.sin(angle)
            self._fp_canvas.create_line(
                cx + sx, cy + sy, cx + ex, cy + ey,
                width=max(1, canvas_size * 2 // 140),
                fill=color, capstyle="round")