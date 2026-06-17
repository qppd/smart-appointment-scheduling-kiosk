"""
Serial Handler for communicating with ESP32 over UART.
Handles the RPi4 <-> ESP32 communication protocol.
"""
import serial
import serial.tools.list_ports
import time
from typing import Optional, Tuple
import threading

class SerialHandler:
    def __init__(self, port: str = "/dev/ttyUSB0", baud: int = 115200, timeout: int = 5):
        self.port = port
        self.baud = baud
        self.timeout = timeout
        self.ser: Optional[serial.Serial] = None
        self._lock = threading.Lock()

    def connect(self) -> bool:
        """Open serial connection to ESP32."""
        try:
            self.ser = serial.Serial(
                port=self.port,
                baudrate=self.baud,
                timeout=self.timeout,
                write_timeout=self.timeout,
            )
            time.sleep(2)
            print(f"[SERIAL] Connected to {self.port}")
            return True
        except serial.SerialException as e:
            print(f"[SERIAL] Connection failed: {e}")
            return False

    def disconnect(self):
        """Close serial connection."""
        if self.ser and self.ser.is_open:
            self.ser.close()
            self.ser = None
            print("[SERIAL] Disconnected")

    def ensure_connected(self) -> bool:
        """Ensure serial connection is open."""
        if self.ser and self.ser.is_open:
            return True
        return self.connect()

    def send_command(self, command: str, timeout: int = 10) -> str:
        """Send a command and wait for response."""
        if not self.ensure_connected():
            return "ERR:Not connected"

        with self._lock:
            try:
                self.ser.reset_input_buffer()
                self.ser.write((command + "\n").encode())
                response = self.ser.readline().decode().strip()
                return response if response else "ERR:No response"
            except Exception as e:
                print(f"[SERIAL] Error sending command: {e}")
                return f"ERR:{e}"

    def ping(self) -> bool:
        """Check if ESP32 is alive."""
        return self.send_command("PING") == "PONG"

    def enroll_fingerprint(self, slot: int = 1) -> Tuple[bool, str]:
        """Enroll a fingerprint at the given slot."""
        resp = self.send_command(f"FP_ENROLL:{slot}", timeout=60)
        if resp.startswith("FP_ENROLLED:"):
            return True, resp.split(":")[1]
        elif resp.startswith("OK"):
            return True, resp
        else:
            return False, resp

    def verify_fingerprint(self) -> Tuple[bool, Optional[int]]:
        """Scan fingerprint and verify against enrolled templates."""
        resp = self.send_command("FP_VERIFY", timeout=30)
        if resp.startswith("FP_MATCH:"):
            return True, int(resp.split(":")[1])
        else:
            return False, None

    def delete_template(self, template_id: int) -> bool:
        """Delete a fingerprint template."""
        resp = self.send_command(f"FP_DELETE:{template_id}")
        return resp.startswith("OK")

    def get_template_count(self) -> int:
        """Get number of enrolled templates."""
        resp = self.send_command("FP_COUNT")
        if resp.startswith("OK:"):
            try:
                return int(resp.split(":")[1])
            except:
                return 0
        return 0

    @staticmethod
    def find_esp32_port() -> Optional[str]:
        """Auto-detect ESP32 serial port."""
        ports = serial.tools.list_ports.comports()
        for p in ports:
            if "USB" in p.description or "CP210" in p.description or "CH340" in p.description or "ACM" in p.device:
                return p.device
        return None
