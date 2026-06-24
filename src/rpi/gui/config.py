"""
Barangay Dolores Kiosk GUI — Color palette, fonts, and display constants.
All pixel values are anchored at the 1024x600 design resolution and
scaled dynamically via compute_scale() so the UI works across screen sizes.
"""
import math

# ── Color Palette (Tailwind-inspired, matching webapp teal theme) ──
PRIMARY = "#0d9488"
PRIMARY_DARK = "#0f766e"
PRIMARY_DEEP = "#115e59"
PRIMARY_LIGHT = "#ccfbf1"
PRIMARY_50 = "#f0fdfa"
SECONDARY = "#f8fafc"
ACCENT = "#1d4ed8"
BG = "#ffffff"
BG_SECONDARY = "#f8fafc"
BG_GRAY = "#f1f5f9"
CARD_BORDER = "#e5e7eb"
CARD_BORDER_LIGHT = "#f3f4f6"
TEXT_PRIMARY = "#111827"
TEXT_SECONDARY = "#6b7280"
TEXT_MUTED = "#9ca3af"
TEXT_WHITE = "#ffffff"
SUCCESS = "#16a34a"
SUCCESS_BG = "#f0fdf4"
ERROR = "#dc2626"
ERROR_BG = "#fef2f2"
WARNING = "#d97706"
WARNING_BG = "#fffbeb"
INFO = "#2563eb"

# ── Design reference resolution ──
REF_W = 1024
REF_H = 600

# ── Dynamic scale (call compute_scale at startup) ──
_SCALE = 1.0

def compute_scale(actual_w: int, actual_h: int):
    """Set the global scale factor based on window size vs reference 1024x600."""
    global _SCALE
    _SCALE = min(actual_w / REF_W, actual_h / REF_H)
    # Clamp so fonts aren't unusably tiny on very small windows
    _SCALE = max(0.35, min(_SCALE, 2.5))

def s(val: float) -> int:
    """Scale a reference pixel value to current window size."""
    return max(1, round(val * _SCALE))

def scaled_font(family: str, base_size: int, weight: str = "normal"):
    """Return a font tuple with size scaled to current window."""
    return (family, max(8, round(base_size * _SCALE)), weight)

# ── Convenience scaled fonts (use these everywhere, not the raw tuples) ──
def get_fonts():
    """Return dict of all font sizes scaled to current _SCALE."""
    return {
        "large": {"family": "Inter", "size": max(8, round(42 * _SCALE)), "weight": "bold"},
        "title": {"family": "Inter", "size": max(8, round(28 * _SCALE)), "weight": "bold"},
        "heading": {"family": "Inter", "size": max(8, round(22 * _SCALE)), "weight": "bold"},
        "subheading": {"family": "Inter", "size": max(8, round(18 * _SCALE)), "weight": "normal"},
        "body": {"family": "Inter", "size": max(8, round(16 * _SCALE)), "weight": "normal"},
        "body_bold": {"family": "Inter", "size": max(8, round(16 * _SCALE)), "weight": "bold"},
        "small": {"family": "Inter", "size": max(8, round(13 * _SCALE)), "weight": "normal"},
        "small_bold": {"family": "Inter", "size": max(8, round(13 * _SCALE)), "weight": "bold"},
        "tiny": {"family": "Inter", "size": max(8, round(11 * _SCALE)), "weight": "normal"},
    }

def font_tuple(font_key: str) -> tuple:
    """Get a CTk/Tk compatible font tuple for the given key."""
    f = get_fonts()[font_key]
    return (f["family"], f["size"], f["weight"])

# ── Window mode ──
FULLSCREEN = True           # set False to window-test on a desktop

TAP_MIN = 44            # min touch target (px)

def s_tap(val: float) -> int:
    """Scale a value but clamp to minimum touch-target size."""
    base = max(1, round(val * _SCALE))
    return max(TAP_MIN, base) if val >= 40 else base

# ── Auth / Timings (constant across screens) ──
ADMIN_PIN = "0000"
HEARTBEAT_INTERVAL = 30000       # 30 seconds (was 10s; reduces REST traffic 3x)
COMMAND_POLL_INTERVAL = 5000     # 5 seconds (was 2s; admin commands tolerate 5s latency)
VERIFY_TIMEOUT = 30000           # 30 seconds
RESULT_AUTO_RETURN = 10000       # 10 seconds
APPOINTMENTS_POLL_INTERVAL = 30  # seconds between full appointment refreshes


def to_12_hour(time_str: str) -> str:
    """Convert a 24-hour time string (e.g., '08:00') to 12-hour format (e.g., '8:00 AM')."""
    if not time_str or " " in time_str:
        return time_str
    try:
        h, m = time_str.split(":")
        h = int(h)
        suffix = "PM" if h >= 12 else "AM"
        if h > 12:
            h -= 12
        elif h == 0:
            h = 12
        return f"{h}:{m} {suffix}"
    except (ValueError, IndexError):
        return time_str