"""
AdminScreen — PIN-protected admin panel for system status monitoring
and ESP32 command control.
"""

import tkinter as tk
import threading
from typing import Optional, Callable
import customtkinter as ctk
from gui.config import (
    PRIMARY, PRIMARY_DARK, PRIMARY_DEEP, PRIMARY_LIGHT, PRIMARY_50,
    ACCENT, BG, BG_SECONDARY, BG_GRAY, CARD_BORDER, CARD_BORDER_LIGHT,
    TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, TEXT_WHITE,
    SUCCESS, SUCCESS_BG, ERROR, ERROR_BG, WARNING, WARNING_BG,
    s, font_tuple, ADMIN_PIN,
)


class AdminScreen(ctk.CTkFrame):
    def __init__(self, master: ctk.CTk,
                 serial_handler,
                 firebase_service,
                 on_back: Callable,
                 **kwargs):
        super().__init__(master, fg_color=BG, **kwargs)
        self.serial_handler = serial_handler
        self.firebase = firebase_service
        self.on_back = on_back
        self._tab = "status"
        self._build_ui()

    def show(self):
        self._refresh_status()

    def update_esp_status(self, connected: bool):
        """Hook for HomeScreen to push ESP32 status here too."""
        try:
            self._refresh_status()
        except Exception:
            pass

    def update_firebase_status(self, connected: bool):
        try:
            self._refresh_status()
        except Exception:
            pass

    def rescale(self):
        """Re-apply scale to header height and rebuilt cards' sizing on resize."""
        try:
            self._resize_admin_header(self._header)
        except Exception:
            pass
        # Refresh status & commands cards if present
        if self._tab == "status":
            self._build_status_tab()
        elif self._tab == "commands":
            self._build_commands_tab()

    def _build_ui(self):
        self.grid_rowconfigure(0, weight=0)
        self.grid_rowconfigure(1, weight=0)
        self.grid_rowconfigure(2, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # ── Header ──
        header = ctk.CTkFrame(self, fg_color=PRIMARY_DARK,
                              corner_radius=0)
        header.grid(row=0, column=0, sticky="ew")
        header.grid_propagate(False)
        self._header = header
        self.after(120, lambda: self._resize_admin_header(header))
        header.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(header, text="Admin Panel",
                     font=font_tuple("heading"), text_color=TEXT_WHITE).pack(
                         side="left", padx=s(20), pady=s(10))
        ctk.CTkButton(header, text="← Back", font=font_tuple("small_bold"),
                      fg_color="transparent", text_color=PRIMARY_LIGHT,
                      hover_color=PRIMARY_DEEP, width=s(60), height=s(30),
                      command=self._on_back).pack(
                          side="right", padx=s(16))

        # ── PIN Gate ──
        self._pin_frame = ctk.CTkFrame(self, fg_color=BG)
        self._pin_frame.grid(row=1, column=0, pady=(s(60), 0))
        self._pin_frame.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(self._pin_frame, text="Enter Admin PIN",
                     font=font_tuple("heading"), text_color=TEXT_PRIMARY
                     ).pack(pady=(0, s(20)))

        pin_row = ctk.CTkFrame(self._pin_frame, fg_color="transparent")
        pin_row.pack()

        self._pin_entry = ctk.CTkEntry(
            pin_row, placeholder_text="PIN",
            font=("Inter", max(8, round(24 * 1.0)), "bold"),
            width=s(140), height=s(44), show="•", justify="center",
            corner_radius=s(10))
        self._pin_entry.pack(side="left", padx=(0, s(10)))
        self._pin_entry.bind("<Return>", lambda e: self._check_pin())

        ctk.CTkButton(pin_row, text="Unlock", font=font_tuple("body_bold"),
                      fg_color=PRIMARY, hover_color=PRIMARY_DARK,
                      width=s(100), height=s(44), corner_radius=s(10),
                      command=self._check_pin).pack(side="left")

        self._pin_error = ctk.CTkLabel(
            self._pin_frame, text="", font=font_tuple("small"),
            text_color=ERROR)
        self._pin_error.pack(pady=(s(8), 0))

        # ── Content (hidden until PIN) ──
        self._content_frame = ctk.CTkFrame(self, fg_color=BG)
        self._content_frame.grid(row=2, column=0, sticky="nsew",
                                 padx=s(20), pady=(s(10), s(20)))
        self._content_frame.grid_columnconfigure(0, weight=1)
        self._content_frame.grid_rowconfigure(1, weight=1)

        # Tab buttons
        self._tab_frame = ctk.CTkFrame(self._content_frame, fg_color="transparent")
        self._tab_frame.grid(row=0, column=0, sticky="ew", pady=(0, s(12)))

        tabs = [
            ("status", "System Status"),
            ("commands", "Commands"),
        ]
        self._tab_btns = {}
        for key, label in tabs:
            btn = ctk.CTkButton(self._tab_frame, text=label,
                                font=font_tuple("small_bold"),
                                fg_color="transparent",
                                text_color=TEXT_SECONDARY,
                                hover_color=BG_GRAY,
                                height=s(36), width=s(140),
                                corner_radius=s(8),
                                command=lambda k=key: self._switch_tab(k))
            btn.pack(side="left", padx=s(4))
            self._tab_btns[key] = btn

        # Tab content area
        self._tab_content = ctk.CTkFrame(self._content_frame, fg_color="transparent")
        self._tab_content.grid(row=1, column=0, sticky="nsew")
        self._tab_content.grid_columnconfigure(0, weight=1)

        # Hide content initially
        self._hide_content()

    def _resize_admin_header(self, header):
        try:
            header.configure(height=s(52))
        except Exception:
            pass

    # ── PIN ──

    def _hide_content(self):
        self._content_frame.grid_remove()

    def _show_content(self):
        self._content_frame.grid()
        self._pin_frame.grid_remove()
        self._switch_tab("status")

    def _check_pin(self):
        pin = self._pin_entry.get()
        if pin == ADMIN_PIN:
            self._pin_error.configure(text="")
            self._show_content()
        else:
            self._pin_error.configure(text="Incorrect PIN")
            self._pin_entry.delete(0, "end")

    # ── Tab Switching ──

    def _switch_tab(self, key: str):
        self._tab = key
        for k, btn in self._tab_btns.items():
            active = k == key
            btn.configure(
                fg_color=PRIMARY_50 if active else "transparent",
                text_color=PRIMARY_DARK if active else TEXT_SECONDARY)

        for w in self._tab_content.winfo_children():
            w.destroy()

        if key == "status":
            self._build_status_tab()
        elif key == "commands":
            self._build_commands_tab()

    # ── Status Tab ──

    def _build_status_tab(self):
        frame = self._tab_content

        ctk.CTkLabel(frame, text="System Status",
                     font=font_tuple("heading"), text_color=TEXT_PRIMARY).pack(
                         anchor="w", pady=(0, s(16)))

        status_items = [
            ("ESP32 Connection", "serial_status", self._check_serial),
            ("Fingerprint Templates", "template_count",
             self._get_template_count),
            ("Firebase Auth", "fb_status", self._get_fb_status),
            ("Heartbeat", "heartbeat", self._get_heartbeat),
        ]

        for label, key, getter in status_items:
            card = ctk.CTkFrame(frame, fg_color=BG, border_width=s(1),
                                border_color=CARD_BORDER_LIGHT,
                                corner_radius=s(10))
            card.pack(fill="x", pady=s(4))
            card.pack_propagate(False)
            self.after(140, lambda c=card: self._resize_status_card(c))
            card.grid_columnconfigure(1, weight=1)

            ctk.CTkLabel(card, text=label, font=font_tuple("body_bold"),
                         text_color=TEXT_PRIMARY).pack(
                             side="left", padx=s(16))
            value_label = ctk.CTkLabel(card, text="...", font=font_tuple("small"),
                                       text_color=TEXT_MUTED)
            value_label.pack(side="right", padx=s(16))

            card.value_label = value_label
            card.getter = getter
            card.key = key

        self._status_items = status_items
        self._status_cards = frame.winfo_children()[1:]
        self._refresh_status()

    def _resize_status_card(self, card):
        try:
            card.configure(height=s(48))
        except Exception:
            pass

    def _refresh_status(self):
        for card in getattr(self, '_status_cards', []):
            try:
                val = str(card.getter() if card.getter else "N/A")
                is_ok = val and all(x not in val
                                    for x in ["Disconnected", "Failed", "N/A", "Error"])
                if card.key == "template_count":
                    is_ok = val not in ("0", "Error")
                card.value_label.configure(
                    text=val,
                    text_color=SUCCESS if is_ok else ERROR)
            except Exception:
                pass

    def _check_serial(self):
        if self.serial_handler and self.serial_handler.ser:
            return "Connected" if self.serial_handler.ser.is_open else "Disconnected"
        return "Disconnected"

    def _get_template_count(self):
        try:
            return str(self.serial_handler.get_template_count())
        except:
            return "Error"

    def _get_fb_status(self):
        import firebase_admin
        return "Authenticated" if (self.firebase and firebase_admin._apps) else "Not Authenticated"

    def _get_heartbeat(self):
        return "Active" if self.firebase else "Inactive"

    # ── Commands Tab ──

    def _build_commands_tab(self):
        frame = self._tab_content

        ctk.CTkLabel(frame, text="ESP32 Commands",
                     font=font_tuple("heading"), text_color=TEXT_PRIMARY).pack(
                         anchor="w", pady=(0, s(16)))

        commands = [
            ("Ping ESP32", "PING", "Check if ESP32 is responsive"),
            ("Get Template Count", "FP_COUNT",
             "Count enrolled fingerprints"),
            ("Clear All Templates", "FP_CLEAR",
             "Warning: Removes ALL fingerprint data"),
        ]

        for label, cmd, desc in commands:
            card = ctk.CTkFrame(frame, fg_color=BG, border_width=s(1),
                                border_color=CARD_BORDER_LIGHT,
                                corner_radius=s(10))
            card.pack(fill="x", pady=s(6))
            card.grid_columnconfigure(1, weight=1)

            ctk.CTkLabel(card, text=label, font=font_tuple("body_bold"),
                         text_color=TEXT_PRIMARY).grid(
                             row=0, column=0, padx=s(16), pady=s(12), sticky="w")
            ctk.CTkLabel(card, text=desc, font=font_tuple("tiny"),
                         text_color=TEXT_MUTED).grid(
                             row=1, column=0, padx=s(16), pady=(0, s(12)),
                             sticky="w")
            ctk.CTkButton(card, text="Send", font=font_tuple("small_bold"),
                          fg_color=PRIMARY, hover_color=PRIMARY_DARK,
                          width=s(80), height=s(32), corner_radius=s(8),
                          command=lambda c=cmd: self._run_command(c)).grid(
                              row=0, column=1, rowspan=2, padx=s(16),
                              sticky="e")

        self._cmd_status = ctk.CTkLabel(
            frame, text="", font=font_tuple("small"), text_color=TEXT_SECONDARY)
        self._cmd_status.pack(pady=(s(12), 0))

    def _run_command(self, cmd: str):
        self._cmd_status.configure(text=f"Sending {cmd}...", text_color=PRIMARY)

        def do_cmd():
            try:
                result = self.serial_handler.send_command(cmd)
                self.after(0, lambda: self._cmd_status.configure(
                    text=f"Response: {result}",
                    text_color=SUCCESS if "OK" in result or "PONG" in result else ERROR))
            except Exception as e:
                self.after(0, lambda: self._cmd_status.configure(
                    text=f"Error: {e}", text_color=ERROR))

        threading.Thread(target=do_cmd, daemon=True).start()

    # ── Navigation ──

    def _on_back(self):
        self._pin_frame.grid()
        self._content_frame.grid_remove()
        self._pin_entry.delete(0, "end")
        self._pin_error.configure(text="")
        self.on_back()

    def refresh_status(self):
        """Refresh status data when switching to this tab."""
        self._refresh_status()