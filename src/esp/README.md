# ESP32 Fingerprint Controller — Arduino IDE

## Prerequisites

1. **Install Arduino IDE 2.x** from https://www.arduino.cc/en/software
2. **Install ESP32 Board Support:**
   - File > Preferences > Additional Boards Manager URLs:
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Tools > Board > Boards Manager > Search "ESP32" > Install "ESP32 by Espressif Systems"
3. **Install Required Libraries:**
   - Tools > Manage Libraries (Ctrl+Shift+I)
   - Search for and install:
     - **"Adafruit Fingerprint Sensor Library"** by Adafruit
     - **"Adafruit BusIO"** by Adafruit (dependency)

## Uploading

### Arduino IDE
1. Open `src/esp/fingerprint_controller/fingerprint_controller.ino` in Arduino IDE
2. Select your board: **Tools > Board > ESP32 Arduino > ESP32 Dev Module**
3. Select the port: **Tools > Port > COMx (ESP32)**
4. Click **Upload** (right arrow button, or Ctrl+U)

### Board Settings
| Setting | Value |
|---------|-------|
| Board | ESP32 Dev Module |
| Upload Speed | 115200 |
| Flash Frequency | 80MHz |
| Flash Mode | QIO |
| Partition Scheme | Default 4MB with spiffs |
| Core Debug Level | None |

## Wiring

| ESP32 Pin | AS608 Pin |
|-----------|-----------|
| 3.3V | VCC |
| GND | GND |
| GPIO16 (RX2) | TX |
| GPIO17 (TX2) | RX |

## Testing

After uploading, open **Tools > Serial Monitor** and set baud rate to **115200**.

Send commands:
- Type `PING` and hit Send — should see `PONG`
- Type `FP_COUNT` — should see `OK:0` (or a number if templates exist)
- Type `FP_ENROLL:1` — follow the on-screen prompts to enroll your fingerprint

See `uart_protocol.md` for the full command reference.
