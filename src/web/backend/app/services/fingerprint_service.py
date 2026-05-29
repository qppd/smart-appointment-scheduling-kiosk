from typing import Optional

# This service communicates with the RPi4 kiosk API
# The RPi4 handles actual UART communication with ESP32 + AS608

FINGERPRINT_COMMANDS = {
    "ENROLL": "FP_ENROLL:{}:{}",       # FP_ENROLL:<resident_id>:<slot_number>
    "VERIFY": "FP_VERIFY:{}",           # FP_VERIFY:<resident_id>
    "DELETE": "FP_DELETE:{}",           # FP_DELETE:<template_id>
    "MATCH": "FP_MATCH",                # Scan and match against enrolled templates
    "COUNT": "FP_COUNT",                # Get number of stored templates
}

def format_enroll_command(resident_id: str, slot_number: int) -> str:
    return f"FP_ENROLL:{resident_id}:{slot_number}"

def format_verify_command(template_id: int) -> str:
    return f"FP_VERIFY:{template_id}"

def format_delete_command(template_id: int) -> str:
    return f"FP_DELETE:{template_id}"
