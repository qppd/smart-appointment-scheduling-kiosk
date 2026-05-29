"""Tests for fingerprint service."""
import pytest
from app.services.fingerprint_service import (
    format_enroll_command,
    format_verify_command,
    format_delete_command,
)

class TestFingerprintService:
    def test_enroll_command_format(self):
        cmd = format_enroll_command("abc-123", 5)
        assert cmd == "FP_ENROLL:abc-123:5"

    def test_verify_command_format(self):
        cmd = format_verify_command(3)
        assert cmd == "FP_VERIFY:3"

    def test_delete_command_format(self):
        cmd = format_delete_command(7)
        assert cmd == "FP_DELETE:7"

    def test_commands_defined(self):
        from app.services.fingerprint_service import FINGERPRINT_COMMANDS
        assert "ENROLL" in FINGERPRINT_COMMANDS
        assert "VERIFY" in FINGERPRINT_COMMANDS
        assert "DELETE" in FINGERPRINT_COMMANDS
        assert "MATCH" in FINGERPRINT_COMMANDS
        assert "COUNT" in FINGERPRINT_COMMANDS
        assert len(FINGERPRINT_COMMANDS) == 5
