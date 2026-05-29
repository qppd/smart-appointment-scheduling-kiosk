"""
Serial Handler for communicating with ESP32 over UART.
Handles the RPi4 <-> ESP32 communication protocol.

Protocol:
  - Commands are sent as text strings, terminated with newline
  - Responses are text strings, terminated with newline
  - Format: CMD:PARAM1:PARAM2:...

Commands:
  FP_ENROLL:<slot>  -> Enroll fingerprint at slot 1-127
  FP_VERIFY         -> Scan and verify against all enrolled templates
  FP_DELETE:<id>    -> Delete template with ID
  FP_COUNT          -> Get number of stored templates
  FP_ID             -> Get last matched template ID
  PING              -> Check if ESP32 is alive

Responses:
  OK:<data>         -> Success with optional data
  ERR:<message>     -> Error with message
  FP_MATCH:<id>     -> Fingerprint matched with template ID
  FP_NO_MATCH       -> No matching fingerprint found
  FP_ENROLLED:<id>  -> Enrollment successful, template ID
  PONG              -> Response to PING
"""
import serial
import serial.tools.list_ports
import time
from typing import Optional, Tuple

class SerialHandler:
    def __init__(self, port: str = "/dev/ttyUSB0", baud: int = 115200, timeout: int = 5):
        self.port = port
        self.baud = baud
        self.timeout = timeout
        self.ser: Optional[serial.Serial] = None

    def connect(self) -> bool:
        """Open serial connection to ESP32."""
        try:
            self.ser = serial.Serial(
                port=self.port,
                baudrate=self.baud,
                timeout=self.timeout,
                write_timeout=self.timeout,
            )
            time.sleep(2)  # Wait for ESP32 reset
            return True
        except serial.SerialException as e:
            print(f"[SERIAL] Connection failed: {e}")
            return False

    def disconnect(self):
        """Close serial connection."""
        if self.ser and self.ser.is_open:
            self.ser.close()
            self.ser = None

    def send_command(self, command: str, timeout: int = 10) -> str:
        """Send a command and wait for response."""
        if not self.ser or not self.ser.is_open:
            return "ERR:Not connected"

        try:
            # Flush input buffer
            self.ser.reset_input_buffer()

            # Send command with newline
            cmd = command + "\n"
            self.ser.write(cmd.encode())

            # Wait for response
            response = self.ser.readline().decode().strip()
            return response if response else "ERR:No response"

        except Exception as e:
            return f"ERR:{e}"

    def ping(self) -> bool:
        """Check if ESP32 is alive."""
        resp = self.send_command("PING")
        return resp == "PONG"

    def enroll_fingerprint(self, slot: int = 1) -> Tuple[bool, str]:
        """
        Enroll a fingerprint at the given slot.
        Returns (success, template_id_or_message).
        """
        resp = self.send_command(f"FP_ENROLL:{slot}", timeout=30)
        if resp.startswith("FP_ENROLLED:"):
            template_id = resp.split(":")[1]
            return True, template_id
        elif resp.startswith("OK"):
            return True, resp
        else:
            return False, resp

    def verify_fingerprint(self) -> Tuple[bool, Optional[int]]:
        """
        Scan fingerprint and verify against enrolled templates.
        Returns (matched, template_id_or_None).
        """
        resp = self.send_command("FP_VERIFY", timeout=15)
        if resp.startswith("FP_MATCH:"):
            template_id = int(resp.split(":")[1])
            return True, template_id
        else:
            return False, None

    def get_fingerprint_id(self) -> Optional[int]:
        """Get the last matched fingerprint ID."""
        resp = self.send_command("FP_ID")
        if resp.startswith("OK:"):
            try:
                return int(resp.split(":")[1])
            except:
                return None
        return None

    def get_template_count(self) -> int:
        """Get number of enrolled templates."""
        resp = self.send_command("FP_COUNT")
        if resp.startswith("OK:"):
            try:
                return int(resp.split(":")[1])
            except:
                return 0
        return 0

    def delete_template(self, template_id: int) -> bool:
        """Delete a fingerprint template."""
        resp = self.send_command(f"FP_DELETE:{template_id}")
        return resp.startswith("OK")

    @staticmethod
    def find_esp32_port() -> Optional[str]:
        """Auto-detect ESP32 serial port."""
        ports = serial.tools.list_ports.comports()
        for p in ports:
            if "USB" in p.description or "CP210" in p.description or "CH340" in p.description:
                return p.device
        return None
