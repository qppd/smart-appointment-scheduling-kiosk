"""
KioskApp — Main customtkinter application.

Ties together:
- Firebase RTDB auth + polling (background thread)
- ESP32 serial connection (background polling for kiosk_commands)
- 4 Kiosk screens: Home → Verify → Result, plus Admin

All UI updates from background threads are routed via after().
"""

import os
import sys
import threading
import time
import traceback
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

import customtkinter as ctk
import firebase_admin
from firebase_admin import credentials, db

from services.serial_handler import SerialHandler
from services.command_processor import CommandProcessor
from gui.config import (
    PRIMARY, PRIMARY_DARK, BG, BG_SECONDARY,
    TEXT_WHITE,
    REF_W, REF_H, FULLSCREEN, compute_scale, s, font_tuple,
    HEARTBEAT_INTERVAL, COMMAND_POLL_INTERVAL,
    APPOINTMENTS_POLL_INTERVAL,
)
from gui.screens.home import HomeScreen
from gui.screens.verify import VerifyScreen
from gui.screens.result import ResultScreen
from gui.screens.admin import AdminScreen
from gui.screens.enroll import EnrollScreen
from gui.screens.otp_enroll import OTPEnrollScreen
from gui.virtual_keyboard import VirtualKeyboard


FIREBASE_DATABASE_URL = os.environ.get("KIOSK_FIREBASE_DATABASE_URL")
SERIAL_PORT = os.environ.get("SERIAL_PORT", "/dev/ttyUSB0")
SERIAL_BAUD = int(os.environ.get("SERIAL_BAUD", "115200"))


import re

# (inside _fetch_and_update or as module-level helper)
def _sanitize_slot_key(key: str) -> str:
    return re.sub(r'[.#$\[\]/]', '_', key)

def _create_slot_key(service_id: str, date: str, start_time: str, end_time: str) -> str:
    return _sanitize_slot_key(f"{service_id}_{date}_{start_time}_{end_time}")

class FirebaseService:
    """Thread-safe wrapper around Firebase Admin SDK Realtime Database."""

    def __init__(self):
        self._db_lock = threading.Lock()

    def get_child(self, path: str):
        with self._db_lock:
            return db.reference(path).get() or {}

    def update_child(self, path: str, data: dict):
        with self._db_lock:
            db.reference(path).update(data)

    def set_child(self, path: str, data):
        with self._db_lock:
            db.reference(path).set(data)


class KioskApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        ctk.set_appearance_mode("light")
        ctk.set_default_color_theme("blue")

        self.title("Barangay Dolores Kiosk")
        self._last_scale = -1.0

        if FULLSCREEN:
            self.attributes("-fullscreen", True)
            # Need the window realized before asking its screen size
            self.update_idletasks()
            w = self.winfo_screenwidth()
            h = self.winfo_screenheight()
            self.geometry(f"{w}x{h}")
        else:
            w, h = 1024, 600
            self.geometry(f"{s(1024)}x{s(600)}")

        # Compute responsive scale BEFORE creating screens
        compute_scale(w, h)

        self.configure(fg_color=BG)
        self.bind("<Escape>", lambda e: None)
        # Live resize support: recompute scale + re-apply fonts when window changes
        self.bind("<Configure>", self._on_window_resize)

        # Backends (initialized before UI)
        self._firebase_ready = False
        try:
            cred = credentials.Certificate(
                os.path.join(os.path.dirname(__file__), "..", "firebase-service-account.json"))
            firebase_admin.initialize_app(cred, {
                "databaseURL": FIREBASE_DATABASE_URL,
            })
            self.fb_service = FirebaseService()
            self._firebase_ready = True
            print("[FIREBASE] Connected and authenticated")
        except Exception as e:
            print(f"[FIREBASE] Connection failed: {e}")
            self.fb_service = None

        # Serial
        self.serial = SerialHandler(port=SERIAL_PORT, baud=SERIAL_BAUD)
        if not self.serial.connect():
            detected = SerialHandler.find_esp32_port()
            if detected:
                print(f"[SERIAL] Auto-detected {detected}, retrying...")
                self.serial = SerialHandler(port=detected, baud=SERIAL_BAUD)
                self.serial.connect()

        self.processor = CommandProcessor(self.serial)
        self.processed_ids = set()
        self.running = True
        self.current_esp_connected = False

        # Caches to keep the polling loop cheap. Populated lazily on
        # first fetch_invalidate_a_user (uid) if/when needed.
        # DON'T load `users/` here at startup: this is the GUI thread
        # and we want kiosk startup < 2 s. The polling loop warms
        # the cache on its first tick.
        self._user_cache = {}              # uid -> user record
        self._template_index = {}          # int(template_id) -> uid
        self._appointments_warmed = False  # set True after first successful tick

        # UI stack
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.home_screen = HomeScreen(
            self, on_verify=self._show_verify, on_admin=self._show_admin,
            on_enroll=self._show_otp_enroll)

        # Update Firebase status after UI is ready
        try:
            self.home_screen.update_firebase_status(self._firebase_ready)
        except Exception:
            pass
        self.verify_screen = VerifyScreen(
            self, serial_handler=self.serial,
            on_result=self._show_result, on_cancel=self._show_home)
        self.result_screen = ResultScreen(
            self, on_done=self._show_home, on_retry=self._show_verify)
        self.admin_screen = AdminScreen(
            self, serial_handler=self.serial,
            firebase_service=self.fb_service, on_back=self._show_home)
        self.otp_enroll_screen = OTPEnrollScreen(
            self, firebase_service=self.fb_service,
            on_proceed=self._proceed_to_enroll,
            on_cancel=self._show_home,
            on_user_changed=self._on_user_changed_app)
        self.enroll_screen = EnrollScreen(
            self, serial_handler=self.serial,
            firebase_service=self.fb_service,
            on_complete=self._enroll_complete, on_cancel=self._show_home,
            on_user_changed=self._on_user_changed_app)

        for s in (self.home_screen, self.verify_screen,
                   self.result_screen, self.admin_screen,
                   self.otp_enroll_screen, self.enroll_screen):
            s.grid(row=0, column=0, sticky="nsew")

        # Threads
        threading.Thread(target=self._heartbeat_loop, daemon=True).start()
        threading.Thread(target=self._commands_loop, daemon=True).start()
        threading.Thread(target=self._appointments_loop, daemon=True).start()
        
        # Virtual keyboard — must be placed above everything else
        self.keyboard = VirtualKeyboard(self, on_close=self._hide_keyboard)
        self._keyboard_active_entry = None

        # Bind keyboard to admin PIN entry (and any other entries on screens)
        for attr in ('_pin_entry',):
            entry = getattr(self.admin_screen, attr, None)
            if entry is not None:
                self.bind_text_input(entry)

        # Poll ESP connection
        self.after(1500, self._check_serial_status)
        self.after(300, self._show_home)

    def bind_text_input(self, entry_widget):
        """Attach the virtual keyboard to a CTkEntry."""
        if entry_widget is None:
            return
        entry_widget.bind("<FocusIn>", lambda e, w=entry_widget: self._show_keyboard(w))
        entry_widget.bind("<FocusOut>", lambda e: self._on_focus_out())
        entry_widget.bind("<Button-1>", lambda e, w=entry_widget: self._show_keyboard(w))

    def on_user_changed(self, uid: str, fresh_user: dict | None = None):
        """Hook for enroll/otp_enroll screens to invalidate the cached
        user record + reverse index after a write, so the very next
        queue refresh shows up-to-date state. Safe to call from any thread.
        """
        if not uid:
            return
        self._user_cache.pop(uid, None)
        # Drop any stale template_id->uid mapping that pointed at this uid
        stale = [tid for tid, cand in self._template_index.items() if cand == uid]
        for tid in stale:
            self._template_index.pop(tid, None)
        if isinstance(fresh_user, dict):
            self._user_cache[uid] = fresh_user
            fp = fresh_user.get("fingerprint_template_id")
            if fp is not None:
                try:
                    self._template_index[int(fp)] = uid
                except (TypeError, ValueError):
                    pass

    # Wrapper used as the `on_user_changed` callback passed to enroll
    # screens, which expect a positional `(uid, fresh_user)` signature.
    def _on_user_changed_app(self, uid, fresh_user=None):
        self.on_user_changed(uid, fresh_user)

    def _show_keyboard(self, entry_widget):
        self._keyboard_active_entry = entry_widget
        self.keyboard.show(entry_widget)

    def _hide_keyboard(self):
        self._keyboard_active_entry = None

    def _on_focus_out(self):
        # Don't hide on focus out since next entry might get focus immediately
        pass

    # ---------- Resize handler ----------
    def _on_window_resize(self, event):
        # Ignore configure events that fire for child widgets
        if event.widget is not self:
            return
        w = event.width
        h = event.height
        if w < 100 or h < 100:
            return
        compute_scale(w, h)
        from gui.config import _SCALE
        if abs(_SCALE - self._last_scale) < 0.02:
            return
        self._last_scale = _SCALE
        # Re-apply fonts and widget sizes on every screen
        for screen_attr in ("home_screen", "verify_screen",
                             "result_screen", "admin_screen",
                             "otp_enroll_screen", "enroll_screen"):
            screen = getattr(self, screen_attr, None)
            if screen and hasattr(screen, "rescale"):
                try:
                    screen.rescale()
                except Exception as exc:
                    print(f"[RESIZE] {screen_attr} rescale failed: {exc}")

    # ---------- UI navigation ----------
    def _show(self, screen):
        previous = getattr(self, "_current_screen", None)
        if previous is self.verify_screen:
            try:
                previous.hide()
            except Exception:
                pass
        screen.tkraise()
        self._current_screen = screen

    def _show_home(self):
        self._show(self.home_screen)

    def _show_verify(self):
        self._show(self.verify_screen)
        self.verify_screen.show()

    def _show_admin(self):
        self._show(self.admin_screen)
        self.admin_screen.show()

    def _show_enroll(self, appt: dict):
        self._show(self.enroll_screen)
        self.enroll_screen.start_for(appt)

    def _show_otp_enroll(self):
        self.otp_enroll_screen.reset()
        self._show(self.otp_enroll_screen)

    def _proceed_to_enroll(self, appt: dict):
        self._show(self.enroll_screen)
        self.enroll_screen.start_for(appt)

    def _enroll_complete(self, appt: dict):
        """After successful enrollment, go straight to Verify."""
        self._show_verify()

    def _show_result(self, matched: bool, template_id, timeout=False):
        if matched:
            self._resolve_and_show_success(template_id)
        else:
            msg = "Timed out" if timeout else "Fingerprint not recognized"
            self.result_screen.show_failure(msg)
            self._show(self.result_screen)

    # ---------- success path: resolve → appointment ----------
    def _resolve_and_show_success(self, template_id):
        """Resolve a fingerprint match to a checked-in appointment
        using the warm cache built by _appointments_loop. If the cache
        hasn't seen this template yet (cold start, race), fall back
        to one per-uid retry rather than scanning whole trees.
        """
        try:
            target_template = int(template_id)
            uid = self._template_index.get(target_template)
            user = None
            if uid and uid in self._user_cache:
                user = self._user_cache[uid]

            # Cold-cache fallback: a single per-uid read instead of
            # scanning the entire users/users + appointments trees.
            if user is None:
                uid = None
                all_users = self.fb_service.get_child("users") or {}
                for cand_uid, u in all_users.items():
                    if not isinstance(u, dict):
                        continue
                    if u.get("fingerprint_template_id") is not None and \
                            int(u["fingerprint_template_id"]) == target_template:
                        uid = cand_uid
                        user = u
                        # Absorb into the cache so subsequent matches don't
                        # hit the network again.
                        self._user_cache[uid] = u
                        self._template_index[target_template] = uid
                        break

            if not uid or not isinstance(user, dict):
                self.result_screen.show_failure(
                    f"No resident found for template {template_id}")
                self._show(self.result_screen)
                return

            resident_id = uid
            resident_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()

            # Find today's appointment. A single read of the appointments
            # node, filtered locally — no per-uid scan.
            today = datetime.now().strftime("%Y-%m-%d")
            appointments = self.fb_service.get_child("appointments") or {}
            appointment = None
            for aid, a in appointments.items():
                if not isinstance(a, dict):
                    continue
                if a.get("resident_id") == resident_id and \
                        a.get("appointment_date") == today and \
                        a.get("status") == "scheduled":
                    appointment = a
                    appointment["id"] = aid
                    break

            if not appointment:
                self.result_screen.show_error(
                    "No appointment scheduled for today")
                self._show(self.result_screen)
                return

            # Mark checked in
            self.fb_service.update_child(
                f"appointments/{appointment['id']}",
                {
                    "status": "checked_in",
                    "verified_by_fingerprint": True,
                    "checked_in_at": int(time.time() * 1000),
                })

            data = {
                "name": resident_name,
                "queue_number": appointment.get("queue_number"),
                "service_name": appointment.get("service_name"),
                "start_time": appointment.get("start_time"),
            }
            self.result_screen.show_success(data)
            self._show(self.result_screen)

        except Exception as e:
            traceback.print_exc()
            self.result_screen.show_error(f"Unable to check in: {e}")
            self._show(self.result_screen)

    # ---------- background loops ----------
    def _check_serial_status(self):
        connected = (self.serial.ser is not None and self.serial.ser.is_open)
        if connected != self.current_esp_connected:
            self.current_esp_connected = connected
            try:
                self.home_screen.update_esp_status(connected)
                self.admin_screen.update_esp_status(connected)
            except Exception:
                pass
        self.after(3000, self._check_serial_status)

    def _heartbeat_loop(self):
        if not self.fb_service:
            return
        while self.running:
            try:
                esp_connected = self.serial.ser is not None and self.serial.ser.is_open
                template_count = 0
                if esp_connected:
                    try:
                        template_count = self.serial.get_template_count()
                    except Exception:
                        pass
                self.fb_service.update_child(
                    "kiosk_status/default",
                    {
                        "online": True,
                        "last_heartbeat": int(time.time() * 1000),
                        "esp32_connected": esp_connected,
                        "template_count": template_count,
                        "updated_at": datetime.now().isoformat() + "Z",
                    })
            except Exception as e:
                print(f"[HEARTBEAT] Error: {e}")
            time.sleep(HEARTBEAT_INTERVAL / 1000)

    def _commands_loop(self):
        if not self.fb_service:
            return
        while self.running:
            try:
                commands = self.fb_service.get_child("kiosk_commands") or {}
                for cid, cmd in commands.items():
                    if not isinstance(cmd, dict):
                        continue
                    if cmd.get("status") != "pending":
                        continue
                    if cid in self.processed_ids:
                        continue
                    print(f"[CMD] {cid}: {cmd.get('type')}")
                    result = self.processor.process(cmd)
                    self.fb_service.update_child(
                        f"kiosk_commands/{cid}",
                        {
                            "status": result.get("status", "completed"),
                            "result": result,
                            "completed_at": int(time.time() * 1000),
                        })
                    self.processed_ids.add(cid)
            except Exception:
                traceback.print_exc()
            time.sleep(COMMAND_POLL_INTERVAL / 1000)

    def _appointments_loop(self):
        """Poll today's appointments + once-per-60s users warm.

        Steady-state cost: ONE Firebase REST request per 30 s tick
        (`appointments`), plus one full `users` read every 60 s to
        refresh names and template indexes. This keeps us comfortably
        under the 100-connection cap even with multiple kiosks.
        """
        if not self.fb_service:
            return

        last_user_refresh = 0.0         # epoch s of last `users` refresher
        last_appt_fetch = 0.0           # epoch s of last `appointments` fetch
        USER_REFRESH_INTERVAL = 60      # s between full `users` reads

        def _refresh_users_cache():
            """One-shot `users` fetch, populates the in-memory cache
            AND the template-id -> uid reverse index. Returns the
            fetched dict (empty on error)."""
            try:
                users = self.fb_service.get_child("users") or {}
                if not isinstance(users, dict):
                    return {}
                self._user_cache = users
                # Rebuild the template_id -> uid reverse index
                self._template_index = {}
                for uid, u in users.items():
                    if not isinstance(u, dict):
                        continue
                    fp = u.get("fingerprint_template_id")
                    if fp is not None:
                        try:
                            self._template_index[int(fp)] = uid
                        except (TypeError, ValueError):
                            continue
                return users
            except Exception:
                traceback.print_exc()
                return {}

        def _fetch_and_update():
            nonlocal last_user_refresh, last_appt_fetch

            now = time.time()
            today = datetime.now().strftime("%Y-%m-%d")

            # Refresh the users cache either on first run, or when the
            # polling interval has elapsed (covers admin promote/demote
            # changes that affect the queue list).
            cache_empty = not self._user_cache
            if cache_empty or (now - last_user_refresh) >= USER_REFRESH_INTERVAL:
                users = _refresh_users_cache()
                last_user_refresh = now
            else:
                users = self._user_cache

            # One per-tick appointment fetch.
            try:
                all_appts = self.fb_service.get_child("appointments") or {}
                last_appt_fetch = now
            except Exception:
                traceback.print_exc()
                all_appts = {}

            # Auto-cancel overdue scheduled appointments.
            now_dt = datetime.now()
            for aid, a in list(all_appts.items()):
                if not isinstance(a, dict):
                    continue
                if a.get("status") != "scheduled":
                    continue
                appt_date = a.get("appointment_date", "")
                end_time_str = a.get("end_time", "")
                if not appt_date or not end_time_str:
                    continue
                try:
                    dt_str = f"{appt_date} {end_time_str}"
                    end_dt = datetime.strptime(dt_str, "%Y-%m-%d %I:%M %p")
                    if now_dt > end_dt:
                        self.fb_service.update_child(
                            f"appointments/{aid}",
                            {
                                "status": "cancelled",
                                "cancelled_at": int(time.time() * 1000),
                                "cancel_reason": "auto_cancelled",
                            })
                        # Release the slot booking
                        slot_key = _create_slot_key(
                            a.get("service_id", ""),
                            appt_date,
                            a.get("start_time", ""),
                            end_time_str,
                        )
                        self.fb_service.set_child(
                            f"appointments/slot_bookings/{slot_key}", None)
                        print(f"[AUTO-CANCEL] Cancelled overdue appointment {aid}")
                except (ValueError, Exception) as e:
                    # Malformed date/time — skip
                    pass

            todays = []
            for aid, a in all_appts.items():
                if not isinstance(a, dict):
                    continue
                if a.get("appointment_date") != today:
                    continue
                a["id"] = aid
                uid = a.get("resident_id")
                u = users.get(uid, {}) if uid else {}
                if isinstance(u, dict):
                    a["resident_first_name"] = u.get("first_name", "")
                    a["resident_last_name"] = u.get("last_name", "")
                    a["fingerprint_enrolled"] = u.get("fingerprint_enrolled", False)
                else:
                    a["resident_first_name"] = ""
                    a["resident_last_name"] = ""
                    a["fingerprint_enrolled"] = False
                todays.append(a)
            self._appointments_warmed = True
            self.after(0, lambda d=list(todays): self.home_screen.update_appointments(d))

        while self.running:
            try:
                _fetch_and_update()
            except Exception:
                traceback.print_exc()
            # Use APPOINTMENTS_POLL_INTERVAL (30 s) — admin commands don't
            # drive this loop and the home queue doesn't need 5 s ticks.
            time.sleep(APPOINTMENTS_POLL_INTERVAL)

    