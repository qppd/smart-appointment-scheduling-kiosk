"""
Display utilities for the kiosk touchscreen UI.
"""
import tkinter as tk

# Color scheme
COLORS = {
    "bg": "#0f766e",         # teal-700
    "bg_dark": "#115e59",    # teal-800
    "bg_light": "#ccfbf1",   # teal-100
    "fg": "#ffffff",
    "fg_dark": "#134e4a",
    "success_bg": "#dcfce7",  # green-100
    "success_fg": "#166534",  # green-800
    "error_bg": "#fee2e2",    # red-100
    "error_fg": "#991b1b",    # red-800
    "warning_bg": "#fef9c3",  # yellow-100
    "warning_fg": "#854d0e",  # yellow-800
    "gray": "#6b7280",
    "gray_light": "#f3f4f6",
}

FONTS = {
    "title": ("Helvetica", 48, "bold"),
    "subtitle": ("Helvetica", 28),
    "body": ("Helvetica", 22),
    "small": ("Helvetica", 16),
    "large": ("Helvetica", 36, "bold"),
    "huge": ("Helvetica", 60, "bold"),
}

def set_fullscreen(window: tk.Tk, fullscreen: bool = True):
    """Toggle fullscreen mode."""
    if fullscreen:
        window.attributes("-fullscreen", True)
        window.bind("<Escape>", lambda e: window.attributes("-fullscreen", False))
    else:
        window.attributes("-fullscreen", False)

def create_button(parent, text: str, command, **kwargs):
    """Create a styled kiosk button."""
    btn = tk.Button(
        parent,
        text=text,
        font=FONTS["body"],
        command=command,
        bg=kwargs.get("bg", COLORS["bg"]),
        fg=kwargs.get("fg", COLORS["fg"]),
        activebackground=kwargs.get("active_bg", COLORS["bg_dark"]),
        activeforeground=kwargs.get("fg", COLORS["fg"]),
        relief="flat",
        padx=kwargs.get("padx", 40),
        pady=kwargs.get("pady", 20),
        cursor="hand2",
        bd=0,
    )
    return btn
