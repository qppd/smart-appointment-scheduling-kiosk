"""
VirtualKeyboard — On-screen keyboard for touchscreen kiosk.
Usage:
    kb = VirtualKeyboard(app, callback=on_keypress, on_close=on_close)
    kb.show()
    kb.hide()

Bind to any entry widget:
    keyboard.bind_entry(entry_widget)
"""

import customtkinter as ctk
from gui.config import (
    BG, BG_SECONDARY, CARD_BORDER, CARD_BORDER_LIGHT, TEXT_PRIMARY, TEXT_SECONDARY, s, font_tuple, PRIMARY, PRIMARY_DARK, PRIMARY_50, PRIMARY_LIGHT
)


class VirtualKeyboard(ctk.CTkFrame):
    """On-screen keyboard that auto-pops on entry focus and docks to bottom."""

    def __init__(self, master: ctk.CTk,
                 target_widget=None,
                 on_close: callable = None,
                 **kwargs):
        super().__init__(master, fg_color=BG_SECONDARY, corner_radius=s(12), **kwargs)
        self.target_widget = target_widget
        self.on_close = on_close
        self._shift = False
        self._caps = False
        self._build_layout()
        self._docked = True
        self.place_forget()  # hidden at start

    # ── Public API ─────────────────────────────────────────────

    def bind_entry(self, widget):
        """Auto-show keyboard when widget gets focus, hide on blur."""
        widget.bind("<FocusIn>", self._on_focus)
        widget.bind("<FocusOut>", self._on_blur)
        # also bind touch events for customtkinter entries
        widget.bind("<Button-1>", self._on_click_entry)

    def show(self, widget=None):
        if widget:
            self.target_widget = widget
        if self.target_widget is None:
            return
        self.lift()
        self.place(relx=0, rely=0.65, relwidth=1, relheight=0.35)
        self._update_keys()

    def hide(self):
        self.place_forget()

    def toggle(self):
        """Toggle visibility."""
        if self.winfo_viewable():
            self.hide()
        else:
            self.show()

    def is_visible(self):
        return self.winfo_viewable()

    # ── Internal ──────────────────────────────────────────────

    def _build_layout(self):
        """Build keyboard grid."""
        self.grid_columnconfigure(0, weight=1)

        # Track rows
        self._rows = []

        # Row 1: digits
        row1 = "1234567890"
        self._make_row(row1)

        # Row 2: QWERTYUIOP
        row2 = "QWERTYUIOP"
        self._make_row(row2)

        # Row 3: ASDFGHJKL
        row3 = "ASDFGHJKL"
        self._make_row(row3)

        # Row 4: ZXCVBNM
        row4 = "ZXCVBNM"
        # Last row includes special keys
        self._make_special_row(row4)

        self._update_keys()

    def _make_row(self, chars: str):
        frame = ctk.CTkFrame(self, fg_color="transparent")
        frame.pack(fill="x", pady=s(2), padx=s(4))
        frame.grid_columnconfigure(tuple(range(len(chars))), weight=1, uniform="key")
        for i, ch in enumerate(chars):
            btn = ctk.CTkButton(
                frame,
                text=ch,
                width=s(44),
                height=s(44),
                font=font_tuple("body_bold"),
                corner_radius=s(8),
                fg_color=BG,
                text_color=TEXT_PRIMARY,
                border_width=1,
                border_color=CARD_BORDER,
                hover_color=CARD_BORDER_LIGHT,
                command=lambda c=ch: self._on_key(c),
            )
            btn.grid(row=0, column=i, sticky="nsew", padx=s(2))
        self._rows.append(frame)

    def _make_special_row(self, chars: str):
        frame = ctk.CTkFrame(self, fg_color="transparent")
        frame.pack(fill="x", pady=s(2), padx=s(4))
        # Shift, letters, Backspace, Clear, Hide
        # Special keys first
        self._shift_btn = ctk.CTkButton(
            frame, text="Shift", width=s(60), height=s(44),
            font=font_tuple("body_bold"), corner_radius=s(8),
            fg_color=PRIMARY, text_color="white", hover_color=PRIMARY_DARK,
            command=self._toggle_shift,
        )
        self._shift_btn.pack(side="left", padx=s(2))

        # Caps Lock
        self._caps_btn = ctk.CTkButton(
            frame, text="Caps", width=s(60), height=s(44),
            font=font_tuple("body_bold"), corner_radius=s(8),
            fg_color=BG, text_color=TEXT_PRIMARY, hover_color=CARD_BORDER_LIGHT,
            command=self._toggle_caps,
        )
        self._caps_btn.pack(side="left", padx=s(2))

        # Space
        self._space_btn = ctk.CTkButton(
            frame, text="Space", width=s(100), height=s(44),
            font=font_tuple("body_bold"), corner_radius=s(8),
            fg_color=BG, text_color=TEXT_PRIMARY, border_width=1, border_color=CARD_BORDER,
            hover_color=CARD_BORDER_LIGHT,
            command=lambda: self._on_key(" "),
        )
        self._space_btn.pack(side="left", padx=s(2))

        # Backspace
        self._backspace_btn = ctk.CTkButton(
            frame, text="Del", width=s(60), height=s(44),
            font=font_tuple("body_bold"), corner_radius=s(8),
            fg_color="red", text_color="white", hover_color="#cc0000",
            command=self._on_backspace,
        )
        self._backspace_btn.pack(side="left", padx=s(2))

        # Clear
        self._clear_btn = ctk.CTkButton(
            frame, text="Clr", width=s(60), height=s(44),
            font=font_tuple("body_bold"), corner_radius=s(8),
            fg_color="orange", text_color="white", hover_color="#cc7700",
            command=self._on_clear,
        )
        self._clear_btn.pack(side="left", padx=s(2))

        # Hide
        self._hide_btn = ctk.CTkButton(
            frame, text="Hide", width=s(60), height=s(44),
            font=font_tuple("body_bold"), corner_radius=s(8),
            fg_color=BG, text_color=TEXT_SECONDARY, border_width=1, border_color=CARD_BORDER,
            hover_color=CARD_BORDER_LIGHT,
            command=self._on_hide,
        )
        self._hide_btn.pack(side="left", padx=s(2))

        self._rows.append(frame)

    def _update_keys(self):
        pass  # keys are static labels, text update can be added for shift/caps

    def _on_key(self, char: str):
        """Insert character at cursor position."""
        if self.target_widget is None:
            return
        if self._shift or self._caps:
            char = char.upper()
        else:
            char = char.lower()

        # Handle insertion
        try:
            current = self.target_widget.get()
            cursor = self.target_widget.index("insert")
            new_text = current[:cursor] + char + current[cursor:]
            self.target_widget.delete(0, "end")
            self.target_widget.insert(0, new_text)
            self.target_widget.icursor(cursor + 1)
        except Exception:
            pass

    def _on_backspace(self):
        if self.target_widget is None:
            return
        try:
            current = self.target_widget.get()
            cursor = self.target_widget.index("insert")
            if cursor > 0:
                new_text = current[:cursor - 1] + current[cursor:]
                self.target_widget.delete(0, "end")
                self.target_widget.insert(0, new_text)
                self.target_widget.icursor(cursor - 1)
        except Exception:
            pass

    def _on_clear(self):
        if self.target_widget is None:
            return
        try:
            self.target_widget.delete(0, "end")
        except Exception:
            pass

    def _on_hide(self):
        self.hide()
        if self.on_close:
            self.on_close()

    def _toggle_shift(self):
        self._shift = not self._shift
        self._shift_btn.configure(fg_color=PRIMARY if self._shift else BG, text_color="white" if self._shift else TEXT_PRIMARY)

    def _toggle_caps(self):
        self._caps = not self._caps
        self._caps_btn.configure(fg_color=PRIMARY if self._caps else BG, text_color="white" if self._caps else TEXT_PRIMARY)

    def _on_focus(self, *args):
        self.show()

    def _on_blur(self, *args):
        # Optional: auto-hide on blur? Can be noisy. Leave it as manual hide.
        pass

    def _on_click_entry(self, *args):
        self.show()