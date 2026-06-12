"""CustomTkinter theme — 2026 modern kiosk aesthetic."""
import customtkinter as ctk

# ── Master palette ──────────────────────────────────────────────
TEAL_PRIMARY = "#0d9488"
TEAL_DARK = "#0f766e"
TEAL_LIGHT = "#14b8a6"
TEAL_GLOW = "#2dd4bf"

DARK_BG = "#111827"       # gray-900
SURFACE = "#1f2937"       # gray-800
CARD = "#374151"          # gray-700
BORDER = "#4b5563"        # gray-600

WHITE = "#f9fafb"
TEXT_MUTED = "#9ca3af"    # gray-400
TEXT_BRIGHT = "#f9fafb"

GREEN_ACCENT = "#22c55e"
GREEN_DARK = "#16a34a"
RED_ACCENT = "#ef4444"
AMBER_ACCENT = "#f59e0b"
BLUE_ACCENT = "#3b82f6"

# ── Theme registration ─────────────────────────────────────────
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("green")

def scale(widget, factor=1.0):
    """Return size scaled by the widget's current window scaling."""
    sf = widget.winfo_fpixels("1i") / 96 if hasattr(widget, "winfo_fpixels") else 1
    return int(factor * sf)