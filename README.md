# Smart Appointment Scheduling Kiosk

Web (Next.js + Firebase RTDB) → RPi4 (pyrebase4) → ESP32 (Fingerprint Sensor via Micro USB)

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────┐      ┌──────┐
│  Next.js    │ ──▶ │  Firebase    │ ◀──  │  RPi4   │ ──▶ │ ESP32│
│  (Vercel)   │      │  Auth + RTDB │      │ Headless│      │ AS608│
│             │ ◀──  │              │ ──▶  │ Service │      │Sensor│
└─────────────┘      └──────────────┘      └─────────┘      └──────┘
```

### Data Flow
1. Resident books appointment via web app → writes to Firebase Realtime Database (RTDB)
2. RPi4 polls RTDB `kiosk_commands` every 2 seconds via pyrebase4
3. ESP32 fingerprints → RPi4 writes result back to RTDB
4. Web app displays real-time updates via RTDB listeners

## Components

### 1. Web App (`src/web/`)
- **Framework:** Next.js 14 (App Router)
- **Auth:** Firebase Authentication (Email/Password)
- **Database:** Firebase Realtime Database (RTDB)
- **Styling:** Tailwind CSS
- **Deploy:** Vercel

### 2. RPi Service (`src/rpi/`)
- **Runtime:** Python 3
- **Firebase:** `pyrebase4` (REST API + email/password auth)
- **Serial:** `pyserial` for ESP32 communication via micro USB (`/dev/ttyUSB0` or `/dev/ttyACM0`)
- **Mode:** Headless daemon (no GUI)

### 3. ESP32 Firmware (`src/esp/`)
- **Library:** Adafruit Fingerprint Sensor Library
- **Connection:** Micro USB cable to RPi4 (serial /dev/ttyUSB0)
- **Protocol:** UART (115200 baud)
- **Sensor:** AS608 fingerprint sensor
- **Stability:** Watchdog-friendly with `yield()` in loops

## Firebase Realtime Database (RTDB) Data Schema

```
users/{uid}             - Resident profiles (auth-linked)
  - first_name, last_name, email, phone, birth_date, address
  - role: "resident" | "admin"
  - status: "pending" | "active"
  - fingerprint_enrolled: boolean
  - fingerprint_template_id: number

services/{service_id}   - Available barangay services
  - name, description, duration_minutes, slot_capacity_per_day, is_active

appointments/{id}       - Booked appointments (push ID)
  - resident_id, service_id, service_name
  - appointment_date, start_time, end_time, queue_number
  - status: "scheduled" | "checked_in" | "completed" | "cancelled"
  - verified_by_fingerprint: boolean
  - created_at: ISO string

kiosk_commands/{id}     - Commands from web to RPi (push ID)
  - type: "verify" | "enroll" | "delete"
  - target_uid, slot
  - status: "pending" | "processing" | "completed" | "failed"
  - result: { ... }

kiosk_status/{kiosk_id}  - RPi4 heartbeat & status
  - online, last_heartbeat, esp32_connected, template_count
```

## Deployment

### Web (Vercel)
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication (Email/Password) and Realtime Database
3. Copy `.env.example` to `.env.local` and fill in your Firebase config (including `NEXT_PUBLIC_FIREBASE_DATABASE_URL`)
4. Deploy to Vercel

### RPi4 (Headless Service)
1. Create a kiosk user in Firebase Authentication (email/password)
2. Create `.env` with your Firebase and auth credentials (see `.env.example`)
3. Install Python dependencies: `pip install -r src/rpi/requirements.txt`
4. Copy the systemd service file:
   ```bash
   sudo cp docs/rpi-systemd/kiosk-firebase.service /etc/systemd/system/
   ```
5. Enable and start:
   ```bash
   sudo systemctl enable --now kiosk-firebase
   ```
6. Check logs:
   ```bash
   sudo journalctl -u kiosk-firebase -f
   ```

### ESP32 (Arduino IDE)
1. Install Adafruit Fingerprint Sensor Library (via Library Manager)
2. Connect ESP32 to RPi4 via micro USB cable
3. Set board to "ESP32 Dev Module"
4. Upload `fingerprint_controller.ino`
5. Verify in Serial Monitor: `OK:ESP32 ready`

## Development

### Web App
```bash
cd src/web
npm install
npm run dev          # http://localhost:3000
```

### RPi Service
```bash
cd src/rpi
pip install -r requirements.txt
python main.py        # Ensure .env file is in the directory
```

## Troubleshooting

- **RPi can't connect to Firebase:** Check `KIOSK_EMAIL` and `KIOS Slip to build pyrebase4; try `pip install --upgrade setuptools
- **RPi can't connect to ESP32:** Verify serial port with `ls /dev/ttyUSB* /dev/ttyACM*`
- **Web app Firebase errors:** Ensure `.env.local` has all required `NEXT_PUBLIC_FIREBASE_*` variables
- **ESP32 watchdog reset:** Firmware includes `yield()` in loops; verify using stable power supply

## Files Changed Summary

| Path | Action | Reason |
|------|--------|--------|
| `src/web/backend/` | Deleted | FastAPI backend replaced by Firebase RTDB |
| `src/web/frontend/` | Deleted | Rebuilt as Next.js app |
| `src/web/` | New Next.js project | Firebase-first, Vercel-ready |
| `src/rpi/ui/` | Deleted | TKinter GUI removed |
| `src/rpi/main.py` | Rewritten | pyrebase4 polling daemon |
| `src/rpi/services/serial_handler.py` | Updated | Auto-reconnect + ACM detection for micro USB |
| `src/rpi/services/command_processor.py` | Created | Maps commands → ESP32 serial |
| `src/esp/fingerprint_controller.ino` | Updated | Watchdog stability fixes |
