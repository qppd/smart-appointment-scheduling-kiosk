# Smart Appointment Scheduling Kiosk 🏛️

> **Web-Based Appointment Scheduling System with Automated Conflict Detection and Fingerprint Authentication Kiosk**
> *Barangay Dolores, Taytay, Rizal*

---

## 📋 Project Overview

A full-stack web-based appointment scheduling system designed to eliminate manual queuing and improve service efficiency at **Barangay Dolores, Taytay, Rizal**. The system integrates **automated conflict detection** (no double-booking) and a **fingerprint authentication kiosk** for secure identity verification.

### Core Problems Solved

| Problem | Solution |
|---|---|
| Long queues & walk-in chaos | Online + kiosk scheduling |
| Overlapping appointments | Automated conflict detection engine |
| Identity fraud / impersonation | Fingerprint biometric verification |
| Lost paper records | Digital appointment ledger |
| No-show inefficiency | SMS/notification reminders |

---

## 🎯 Core Features

### 1. Web-Based Appointment Portal
- **Resident-facing website** — Book, reschedule, or cancel appointments online
- **Service catalog** — Browse available barangay services (certificates, clearances, ID applications, etc.)
- **Real-time slot availability** — See open time slots before booking
- **Multi-step booking wizard** — Select service → pick date/time → provide details → confirm
- **Responsive design** — Works on mobile phones, tablets, and desktops

### 2. Automated Conflict Detection Engine
- **Double-booking prevention** — Server-side validation on every slot selection
- **Per-service slot management** — Each service type has configurable capacity & duration
- **Grace period enforcement** — Buffer time between appointments
- **Real-time availability refresh** — WebSocket-based live updates when a slot is taken

### 3. Fingerprint Authentication Kiosk
- **Self-service kiosk mode** — Touchscreen + fingerprint scanner at the barangay hall
- **Fingerprint enrollment** — First-time residents register their fingerprint + ID
- **Check-in verification** — Scan fingerprint upon arrival to confirm identity
- **Admin override** — PIN-based fallback for fingerprint failure
- **Offline fallback** — Cached templates for when internet is down

#### Hardware Stack
| Component | Model |
|---|---|
| **Kiosk Host** | Raspberry Pi 4 |
| **Fingerprint Sensor** | AS608 optical fingerprint module |
| **Microcontroller** | ESP32 (communicates with RPi4 via UART/serial) |
| **Display** | Touchscreen LCD (7" recommended for kiosk mode) |

The ESP32 runs firmware that handles fingerprint enrollment and verification directly on the AS608 module. The RPi4 communicates with the ESP32 over serial/UART — sending commands (enroll, verify, delete) and receiving responses (match success/failure, template ID). This architecture offloads real-time biometric processing to the ESP32, keeping the RPi4 free for running the web kiosk interface.

### 4. Admin Dashboard
- **Appointment queue board** — Real-time display of today's schedule
- **Service management** — CRUD for services, durations, capacity
- **Resident directory** — Searchable registry with biometric status
- **Reporting & analytics** — Daily/weekly/monthly appointment statistics
- **User management** — Barangay staff roles (admin, encoder, verifier)

### 5. Notification System
- **SMS reminders** — One day before and 1 hour before appointment
- **Queue number alerts** — Notify when turn is approaching
- **Reschedule/cancellation confirmations** — Two-way acknowledgment

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Frontend (Web)                      │
│     React + Tailwind CSS + PWA (mobile-ready)         │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼───────────────────────────────┐
│                    API Server                          │
│                  FastAPI (Python)                      │
└─────┬────────────────────┬─────────────────┬─────────┘
      │                    │                 │
┌─────▼──────┐   ┌────────▼───────┐   ┌────▼────────┐
│  Database   │   │  Kiosk (RPi4)  │   │  SMS/Notify  │
│  PostgreSQL │   │  Touchscreen   │   │  (Twilio)    │
│  + Redis    │   │       │        │   │              │
└─────────────┘   │  ┌────▼────┐  │   └─────────────┘
                  │  │ ESP32   │  │
                  │  │ + AS608 │  │
                  │  └─────────┘  │
                  └───────────────┘
```

### Technology Stack (Proposed)

| Layer | Technology | Hardware |
|---|---|---|
| **Frontend** | React.js + Tailwind CSS + Vite | — |
| **Backend** | FastAPI (Python) | Server / VPS |
| **Database** | PostgreSQL + Redis (caching/sessions) | Server / VPS |
| **Fingerprint** | AS608 on ESP32 (custom firmware) | RPi4 ↔ ESP32 via UART |
| **Kiosk OS** | Raspberry Pi 4 (Raspberry Pi OS Lite) | RPi4 + Touchscreen LCD |
| **SMS** | Twilio API / Semaphore (local PH provider) | — |
| **Deployment** | Docker Compose on VPS or local server | — |

---

## 🗂️ Project Structure

```
smart-appointment-scheduling-kiosk/
├── frontend/                 # React web app
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page views (Booking, Queue, Dashboard)
│   │   ├── services/         # API client & auth hooks
│   │   ├── store/            # State management (Zustand)
│   │   └── utils/            # Helpers & formatters
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── api/              # Route handlers
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   │   ├── conflict_detection.py  # Conflict engine
│   │   │   ├── fingerprint_service.py # Biometric logic
│   │   │   └── notification_service.py
│   │   ├── core/             # Config, security, DB
│   │   └── main.py
│   ├── alembic/              # DB migrations
│   ├── requirements.txt
│   └── Dockerfile
├── kiosk/                    # Kiosk client app (RPi4)
│   ├── main.py               # Kiosk entry point
│   ├── serial_handler.py     # Communication with ESP32 over UART
│   ├── ui/                   # Touchscreen UI (Tkinter / PyQt)
│   └── config.yaml
├── firmware/                 # ESP32 firmware source
│   ├── fingerprint_controller/   # Arduino/PlatformIO project
│   │   ├── src/
│   │   │   └── main.cpp      # UART command handler + AS608 driver
│   │   ├── lib/
│   │   │   └── Adafruit_Fingerprint/  # AS608 library
│   │   ├── platformio.ini
│   │   └── README.md
│   └── uart_protocol.md      # Command protocol spec (RPi4 ↔ ESP32)
├── docs/                     # Documentation
│   ├── api-spec.md
│   ├── database-schema.md
│   └── setup-guide.md
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🗄️ Database Schema (High-Level)

```
residents
  ├── id (PK)
  ├── first_name, last_name, middle_name
  ├── birth_date, contact_number, address
  ├── fingerprint_template (BLOB)  — encrypted
  ├── fingerprint_registered_at
  └── created_at

services
  ├── id (PK)
  ├── name         — e.g. "Barangay Clearance"
  ├── description
  ├── duration_minutes
  ├── slot_capacity_per_day
  ├── is_active
  └── department

appointments
  ├── id (PK)
  ├── resident_id (FK → residents)
  ├── service_id (FK → services)
  ├── appointment_date
  ├── start_time
  ├── end_time
  ├── status       — scheduled | confirmed | checked_in | completed | cancelled | no_show
  ├── queue_number
  ├── notes
  ├── verified_by_fingerprint (boolean)
  └── created_at

time_slots
  ├── id (PK)
  ├── service_id (FK)
  ├── date
  ├── start_time
  ├── end_time
  ├── is_available (boolean)
  └── version (for optimistic locking / conflict detection)

notifications
  ├── id (PK)
  ├── appointment_id (FK)
  ├── type          — reminder | confirmation | alert
  ├── channel       — sms | email
  ├── sent_at
  └── status
```

---

## 📅 Development Phases

### Phase 1 — Foundation (Weeks 1–3)
- [ ] Set up project scaffolding (frontend + backend)
- [ ] Configure PostgreSQL schema & Alembic migrations
- [ ] Implement basic user/resident CRUD endpoints
- [ ] Build service catalog API + UI
- [ ] Deploy Docker Compose dev environment

### Phase 2 — Appointment Engine (Weeks 4–6)
- [ ] Build conflict detection algorithm
- [ ] Implement appointment booking API (create, reschedule, cancel)
- [ ] Slot availability calendar component (frontend)
- [ ] Booking wizard UI
- [ ] Admin queue board (real-time view)
- [ ] Unit tests for conflict detection edge cases

### Phase 3 — Fingerprint Kiosk (Weeks 7–9)
- [ ] Integrate fingerprint SDK (enrollment + verification)
- [ ] Build kiosk UI (touchscreen-friendly)
- [ ] Kiosk check-in flow (scan → verify → mark arrived)
- [ ] Offline mode for kiosk (local cache)
- [ ] Admin override PIN flow
- [ ] Test with actual fingerprint hardware

### Phase 4 — Notifications & Polish (Weeks 10–11)
- [ ] SMS reminder system (Twilio / Semaphore)
- [ ] Queue number SMS alerts
- [ ] Dashboard analytics & charts
- [ ] Error handling & edge cases
- [ ] Performance optimization

### Phase 5 — Deployment (Week 12)
- [ ] Security audit (biometric data encryption)
- [ ] Barangay server setup (local + cloud backup)
- [ ] Staff training & documentation
- [ ] Pilot run with barangay staff
- [ ] Go-live

---

## 🔐 Security Considerations

- **Biometric data** — Fingerprint templates encrypted at rest (AES-256); never stored as raw images
- **TLS everywhere** — HTTPS enforced for web & API traffic
- **Rate limiting** — Prevent brute-force on fingerprint verification & login
- **Role-based access control** — Admin, encoder, verifier roles with granular permissions
- **Audit logging** — All appointment changes, fingerprint scans, and admin actions logged
- **GDPR-aligned PH data privacy** — Compliant with Philippines Data Privacy Act (RA 10173)

---

## 👥 Target Users

| User | Interaction |
|---|---|
| **Resident** | Books appointments via web or walks in to use the kiosk |
| **Barangay Staff (Encoder)** | Manages services, slots, resident records |
| **Barangay Staff (Verifier)** | Oversees kiosk check-in, handles exceptions |
| **Administrator** | Full system control, reports, user roles |
| **System Admin** | Maintenance, backups, security |

---

## 🚀 Getting Started (Dev Setup)

```bash
# Clone the repo
git clone https://github.com/qppd/smart-appointment-scheduling-kiosk.git
cd smart-appointment-scheduling-kiosk

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env  # Configure your database URL etc.
alembic upgrade head
uvicorn app.main:app --reload

# Frontend setup (another terminal)
cd frontend
npm install
npm run dev

# Kiosk setup (on the Raspberry Pi 4 + ESP32)
cd kiosk
pip install -r requirements.txt
python main.py     # GUI kiosk app — communicates with ESP32 over /dev/ttyUSB0

# Flash ESP32 firmware (separate terminal)
cd firmware/fingerprint_controller
platformio run --target upload
```

---

## 📄 License

MIT License — See `LICENSE` for details.

---

*Developed for Barangay Dolores, Taytay, Rizal — improving public service delivery through technology.* 🇵🇭