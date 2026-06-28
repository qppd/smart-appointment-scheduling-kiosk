# Smart Appointment Scheduling Kiosk

A complete appointment scheduling and biometric check-in system designed for **Barangay (community-level government)** service management in the Philippines. Residents book appointments online, verify via SMS OTP, and check in at a physical kiosk using **AS608 fingerprint biometrics**.

---

## System Architecture

**Architecture (4 tiers):** Next.js + Firebase → RPi4 (Python GUI) → ESP32 (UART) → AS608 Sensor

### Summary Diagram (as-built)

```
  [Resident Browser]     [Admin Browser]          [Kiosk Touchscreen]
        │                      │                        │
        │   HTTPS/WSS         │   HTTPS/WSS            │  HTTPS REST
        ▼                      ▼                        ▼
   ┌──────────────────────────────────────────────────────┐
   │                  FIREBASE PLATFORM                    │
   │  ┌─────────────────┐     ┌────────────────────────┐  │
   │  │   Auth           │     │   Realtime Database    │  │
   │  │ (Email/Password) │     │   (RTDB - JSON NoSQL) │  │
   │  └─────────────────┘     └──────┬─────────────────┘  │
   │                                 │                    │
   │  RTDB Nodes: users/{uid}, services/{id},             │
   │  appointments/{id}, slot_bookings/{key},             │
   │  kiosk_commands/{id}, kiosk_status/{id}              │
   └──────────────────────┬───────────────────────────────┘
                          │
            ┌─────────────┴──────────────┐
            ▼                            ▼
   ┌─────────────────┐       ┌──────────────────────────┐
   │  Vercel Edge    │       │  RPi4 Kiosk (Python)     │
   │  Next.js 14     │       │  customtkinter GUI       │
   │  9 pages        │       │  firebase-admin SDK      │
   │  5 API routes   │       │  pyserial (115200 baud)  │
   │  Semaphore SMS  │       │  3 background threads    │
   └─────────────────┘       └──────────┬───────────────┘
                                        │ Serial 115200
                                        ▼
                               ┌──────────────────┐
                               │  ESP32 + AS608   │
                               │  10 commands     │
                               │  127 templates   │
                               │  500ms monitor   │
                               └──────────────────┘
```

### Tiers

| Tier | Technology | Role |
|------|-----------|------|
| **Web App** | Next.js 14 + React 18 + TypeScript + Tailwind CSS + Firebase SDK | Online booking, admin dashboard, queue display, SMS notifications |
| **Cloud** | Firebase Auth + Realtime Database | Auth, data store, real-time sync, command queue |
| **Kiosk** | Raspberry Pi 4 + Python 3 + customtkinter + firebase-admin + pyserial | Touchscreen GUI, fingerprint ops, OTP enrollment, admin panel |
| **Hardware** | ESP32 + AS608 Fingerprint Sensor (Arduino C++) | Fingerprint enrollment, 1:N matching, continuous monitoring |

### Adviser Reference & Gap Analysis

The adviser's reference design includes a **centralized Application Backend**, **Cloud Firestore**, **Twilio SMS**, and **Thermal Printer**. See the full comparison in [System Architecture](docs/system-architecture.md#c-gaps-adviser-reference-vs-actual-implementation).

---

## Key Data Flow

```
Booking:     Browser → runTransaction(slot_bookings) → set(appointment) → SMS confirm
Enrollment:  Browser → OTP displayed → Kiosk OTP entry → verify → ESP32 enroll → RTDB update
Check-in:    Kiosk → FP_VERIFY → ESP32 1:N match → lookup uid → update status → RTDB listener
Reminders:   Cron script → Firebase Admin SDK → check 25-35min window → Semaphore SMS
Monitor:     ESP32 monitor mode → 500ms poll → FP_MATCH/FP_NO_MATCH events

---

## Firebase Realtime Database (RTDB) Schema

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

For the full database schema documentation, see [docs/database/database-schema.md](docs/database/database-schema.md).

---

## Components

```
smart-appointment-scheduling-kiosk/
├── README.md
├── docs/
│   ├── system-architecture.md    ← New: Full architecture docs
│   ├── components.md               ← New: Component-level details
│   ├── tech-stack.md               ← New: Technology inventory
│   ├── flow-diagrams.md            ← New: Sequence & flow diagrams
│   ├── specifications.md           ← New: Hardware & software specs
│   ├── software-requirements.md    ← New: Requirements specification
│   ├── api/api-spec.md
│   ├── database/database-schema.md
│   ├── development/dev-guide.md
│   ├── hardware/hardware-setup.md
│   ├── setup/setup-guide.md
│   └── rpi-systemd/kiosk-firebase.service
├── src/
│   ├── web/              # Next.js 14 web application
│   ├── rpi/              # Raspberry Pi 4 kiosk application
│   └── esp/              # ESP32 firmware (Arduino C++)
└── model/                # 3D enclosure renders
```

---

## Tech Stack

### Web Application
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | ^14.2.7 | React framework with App Router |
| React | ^18.3.1 | UI library |
| TypeScript | ^5.5.4 | Static typing |
| Tailwind CSS | ^3.4.10 | Utility-first CSS |
| Firebase SDK | ^10.13.0 | Auth + RTDB |
| date-fns | ^3.6.0 | Date formatting |
| lucide-react | ^0.439.0 | Icon library |
| Semaphore SMS | — | Philippine SMS gateway (send-otp, verify-otp, booking-confirmation, reminder, send) |

### Raspberry Pi 4 Kiosk
| Technology | Version | Purpose |
|------------|---------|---------|
| Python 3 | 3.12+ | Runtime |
| customtkinter | ^5.2.2 | Modern GUI |
| firebase-admin | ^6.5.0 | Firebase Admin SDK |
| pyserial | ^3.5 | Serial communication |
| Pillow | ^10.4.0 | Image processing |
| python-dotenv | ^1.0.1 | Environment variables |

### ESP32 Firmware
| Technology | Purpose |
|------------|---------|
| Arduino Core (ESP32) | Microcontroller framework |
| Adafruit Fingerprint Sensor Library | AS608 sensor communication |

For the complete dependency list and version rationale, see [docs/tech-stack.md](docs/tech-stack.md).

---

## Deployment

### Web (Vercel)
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication (Email/Password) and Realtime Database
3. Copy `.env.example` to `.env.local` and fill in your Firebase config (including `NEXT_PUBLIC_FIREBASE_DATABASE_URL`)
4. Deploy to Vercel

### RPi4 (Kiosk Service)
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

For detailed setup instructions, see [docs/setup/setup-guide.md](docs/setup/setup-guide.md) and [docs/hardware/hardware-setup.md](docs/hardware/hardware-setup.md).

---

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

### ESP32 Firmware
See [src/esp/README.md](src/esp/README.md) and [src/esp/uart_protocol.md](src/esp/uart_protocol.md) for detailed Arduino IDE setup and UART protocol reference.

---

## Troubleshooting

- **RPi can't connect to Firebase:** Check `KIOSK_EMAIL` and `KIOSK_PASSWORD` in `.env`; verify internet connectivity
- **RPi can't connect to ESP32:** Verify serial port with `ls /dev/ttyUSB* /dev/ttyACM*`
- **Web app Firebase errors:** Ensure `.env.local` has all required `NEXT_PUBLIC_FIREBASE_*` variables
- **ESP32 watchdog reset:** Firmware includes `yield()` in loops; verify using stable power supply

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| [System Architecture](docs/system-architecture.md) | Full system architecture, deployment diagrams, security architecture |
| [Component Details](docs/components.md) | Component-level breakdown, interfaces, dependencies |
| [Technology Stack](docs/tech-stack.md) | Complete technology inventory with versions and rationale |
| [Flow Diagrams](docs/flow-diagrams.md) | Sequence diagrams, flowcharts, data flow visuals |
| [Hardware & Software Specs](docs/specifications.md) | Detailed hardware and software specifications |
| [Software Requirements](docs/software-requirements.md) | Functional and non-functional requirements (SRS) |
| [Setup Guide](docs/setup/setup-guide.md) | Step-by-step installation and configuration |
| [Hardware Setup](docs/hardware/hardware-setup.md) | Wiring diagrams and assembly instructions |
| [Database Schema](docs/database/database-schema.md) | Firebase RTDB schema documentation |
| [API Specification](docs/api/api-spec.md) | REST API endpoint documentation |
| [Development Guide](docs/development/dev-guide.md) | Development workflow and architecture |
| [ESP32 UART Protocol](src/esp/uart_protocol.md) | Serial communication protocol reference |

---

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
| `docs/system-architecture.md` | Created | Comprehensive system architecture documentation |
| `docs/components.md` | Created | Detailed component breakdown |
| `docs/tech-stack.md` | Created | Complete technology and library inventory |
| `docs/flow-diagrams.md` | Created | Flowcharts and sequence diagrams |
| `docs/specifications.md` | Created | Hardware and software specifications |
| `docs/software-requirements.md` | Created | Software requirements specification (SRS) |
