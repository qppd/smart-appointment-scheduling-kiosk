"""
Command Processor - maps Firestore kiosk_commands to ESP32 serial actions.
"""
import time
from typing import Any, Dict
from services.serial_handler import SerialHandler


class CommandProcessor:
    def __init__(self, serial_handler: SerialHandler):
        self.serial = serial_handler

    def process(self, command: Dict[str, Any]) -> Dict[str, Any]:
        cmd_type = command.get("type")
        result = {"status": "failed", "message": "Unknown command type"}

        if cmd_type == "verify":
            matched, template_id = self.serial.verify_fingerprint()
            if matched:
                result = {"status": "completed", "matched": True, "template_id": template_id, "message": f"Fingerprint matched: {template_id}"}
            else:
                result = {"status": "completed", "matched": False, "message": "No fingerprint match"}

        elif cmd_type == "enroll":
            slot = command.get("slot", 1)
            success, data = self.serial.enroll_fingerprint(slot)
            if success:
                result = {"status": "completed", "template_id": data, "message": f"Enrolled at slot {slot}"}
            else:
                result = {"status": "failed", "message": data}

        elif cmd_type == "auto_enroll":
            success, data = self.serial.auto_enroll_fingerprint()
            if success:
                result = {"status": "completed", "template_id": data, "message": f"Auto-enrolled at slot {data}"}
            else:
                result = {"status": "failed", "message": data}

        elif cmd_type == "search":
            matched, template_id = self.serial.search_fingerprint()
            if matched:
                result = {"status": "completed", "matched": True, "template_id": template_id, "message": f"Fingerprint matched: {template_id}"}
            else:
                result = {"status": "completed", "matched": False, "message": "No fingerprint match"}

        elif cmd_type == "delete":
            template_id = command.get("template_id")
            if template_id is not None:
                ok = self.serial.delete_template(template_id)
                result = {"status": "completed" if ok else "failed", "message": "Deleted" if ok else "Delete failed"}
            else:
                result = {"status": "failed", "message": "template_id required"}

        elif cmd_type == "list":
            ids = self.serial.list_templates()
            result = {"status": "completed", "count": len(ids), "template_ids": ids, "message": f"Found {len(ids)} enrolled fingerprint(s)"}

        elif cmd_type == "clear":
            ok = self.serial.clear_database()
            result = {"status": "completed" if ok else "failed", "message": "Database cleared" if ok else "Clear failed"}

        elif cmd_type == "monitor":
            on = self.serial.toggle_monitor_mode()
            result = {"status": "completed", "monitor_on": on, "message": "Monitor ON" if on else "Monitor OFF"}

        elif cmd_type == "count":
            count = self.serial.get_template_count()
            result = {"status": "completed", "count": count}

        elif cmd_type == "ping":
            ok = self.serial.ping()
            result = {"status": "completed", "message": "PONG" if ok else "No response"}

        return result
