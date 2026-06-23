"""
Serial Handler for communicating with ESP32 over UART.
Handles the RPi4 <-> ESP32 communication protocol.
"""
import serial
import serial.tools.list_ports
import time
from typing import Optional, Tuple, List
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
                self.ser.reset_output_buffer()
                self.ser.write((command + "\n").encode())
                self.ser.flush()  # Ensure data is sent

                start = time.time()
                while time.time() - start < timeout:
                    raw = self.ser.readline()
                    if not raw:
                        time.sleep(0.01)
                        continue
                    line = raw.decode('utf-8', errors='replace').strip()
                    if not line:
                        continue
                    # Skip debug lines — they are diagnostics, not command results
                    if line.startswith("[DEBUG]"):
                        continue
                    return line
                return "ERR:No response"
            except PermissionError as e:
                print(f"[SERIAL] Permission error (device busy): {e}")
                return f"ERR:PermissionError - device busy"
            except Exception as e:
                print(f"[SERIAL] Error sending command: {e}")
                return f"ERR:{e}"

    def ping(self) -> bool:
        """Check if ESP32 is alive."""
        return self.send_command("PING") == "PONG"

    def find_free_slot(self) -> int:
        """Find the next available fingerprint template slot (1-127)."""
        count = self.get_template_count()
        if count >= 127:
            return -1
        return count + 1

    def enroll_fingerprint(self, slot: int = 1) -> Tuple[bool, str]:
        """Enroll a fingerprint at the given slot. Reads multi-line ESP response."""
        if not self.ensure_connected():
            return False, "ERR:Not connected"

        with self._lock:
            try:
                self.ser.reset_input_buffer()
                self.ser.reset_output_buffer()
                self.ser.write(f"FP_ENROLL:{slot}\n".encode())
                self.ser.flush()

                deadline = time.time() + 60
                while time.time() < deadline:
                    raw = self.ser.readline()
                    if not raw:
                        continue
                    line = raw.decode('utf-8', errors='replace').strip()
                    if not line:
                        continue
                    if line.startswith("FP_ENROLLED:"):
                        parts = line.split(":")
                        return True, parts[1] if len(parts) > 1 else str(slot)
                    elif line.startswith("ERR:"):
                        return False, line
                return False, "ERR:Enrollment timed out"
            except PermissionError as e:
                print(f"[SERIAL] Enrollment permission error: {e}")
                return False, "ERR:PermissionError - device busy"
            except Exception as e:
                print(f"[SERIAL] Enrollment error: {e}")
                return False, f"ERR:{e}"

    def auto_enroll_fingerprint(self) -> Tuple[bool, str]:
        """Enroll a fingerprint to the next available slot. Reads multi-line ESP response."""
        if not self.ensure_connected():
            return False, "ERR:Not connected"

        with self._lock:
            try:
                self.ser.reset_input_buffer()
                self.ser.reset_output_buffer()
                self.ser.write("FP_AUTOENROLL\n".encode())
                self.ser.flush()

                deadline = time.time() + 60
                while time.time() < deadline:
                    raw = self.ser.readline()
                    if not raw:
                        continue
                    line = raw.decode('utf-8', errors='replace').strip()
                    if not line:
                        continue
                    if line.startswith("FP_ENROLLED:"):
                        parts = line.split(":")
                        return True, parts[1] if len(parts) > 1 else "0"
                    elif line.startswith("ERR:"):
                        return False, line
                return False, "ERR:Enrollment timed out"
            except PermissionError as e:
                print(f"[SERIAL] Auto-enrollment permission error: {e}")
                return False, "ERR:PermissionError - device busy"
            except Exception as e:
                print(f"[SERIAL] Auto-enrollment error: {e}")
                return False, f"ERR:{e}"

    def verify_fingerprint(self) -> Tuple[bool, Optional[int]]:
        """Scan fingerprint and verify against enrolled templates."""
        resp = self.send_command("FP_VERIFY", timeout=30)
        if resp.startswith("FP_MATCH:"):
            return True, int(resp.split(":")[1])
        else:
            return False, None

    def search_fingerprint(self) -> Tuple[bool, Optional[int]]:
        """Search for a fingerprint in the database."""
        resp = self.send_command("FP_SEARCH", timeout=30)
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

    def list_templates(self) -> List[int]:
        """List all enrolled fingerprint template IDs."""
        if not self.ensure_connected():
            return []

        with self._lock:
            try:
                self.ser.reset_input_buffer()
                self.ser.write("FP_LIST\n".encode())

                ids = []
                deadline = time.time() + 5
                while time.time() < deadline:
                    raw = self.ser.readline()
                    if not raw:
                        continue
                    line = raw.decode('utf-8', errors='replace').strip()
                    if line.startswith("OK:"):
                        pass  # Just count info, continue reading ID lines
                    elif line.startswith("ID:"):
                        try:
                            ids.append(int(line.split(":")[1]))
                        except (IndexError, ValueError):
                            pass
                    elif line.startswith("[DEBUG]"):
                        continue  # Skip debug lines
                    else:
                        # End of listing or unknown line
                        if len(line) > 0 and not line.startswith("ERR:"):
                            break
                        elif not line:
                            break
                return ids
            except Exception as e:
                print(f"[SERIAL] List templates error: {e}")
                return []

    def toggle_monitor_mode(self) -> bool:
        """Toggle continuous fingerprint monitoring mode."""
        resp = self.send_command("FP_MONITOR")
        return "Monitor ON" in resp

    def clear_database(self) -> bool:
        """Clear all fingerprint templates."""
        resp = self.send_command("FP_CLEAR")
        return resp.startswith("OK")

    @staticmethod
    def find_esp32_port() -> Optional[str]:
        """Auto-detect ESP32 serial port."""
        ports = serial.tools.list_ports.comports()
        for p in ports:
            if "USB" in p.description or "CP210" in p.description or "CH340" in p.description or "ACM" in p.device:
                return p.device
        return None
