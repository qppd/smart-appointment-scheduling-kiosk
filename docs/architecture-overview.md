# Smart Appointment Scheduling Kiosk — Architecture Overview

> **System:** Barangay Dolores, Taytay, Rizal
> **Architecture:** Hybrid — Web (Vercel + Supabase) + RPi4 (Local Kiosk) + ESP32 (Fingerprint Sensor)
> **Deadline:** June 24, 2026

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (Cloud)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Auth     │  │PostgreSQL│  │ Storage  │  │  Edge Func │  │
│  │ (OTP via  │  │(residents│  │ (avatars │  │ (Semaphore │  │
│  │ Supabase/ │  │appointmts│  │ docs)    │  │  SMS OTP)  │  │
│  │ Semaphore)│  │services) │  │          │  │            │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ RLS + API (anon + service_role)
                         │
           ┌─────────────┼────────────────────┐
           │             │                    │
           ▼             ▼                    ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│   WEB APP        │ │  BARANGAY    │ │  KIOSK (RPi4)     │
│  (Vercel)        │ │  STAFF       │ │  Python App       │
│  Next.js +       │ │  Desktop     │ │  - Touchscreen UI │
│  Tailwind        │ │  Browser     │ │  - Serial comm    │
│  - Resident      │ │  - Dashboard │ │  - Fingerprint    │
│    portal        │ │  - Manage    │ │    enroll/verify   │
│  - Register/     │ │    services  │ │  - Account        │
│    Book/Check    │ │  - View      │ │    activation      │
│    Appointments  │ │    queue     │ │                    │
│  - Admin panel   │ │  - Reports   │ │                    │
└──────────────────┘ └──────────────┘ └───────┬────────────┘
                                              │ UART Serial
                                              ▼
                                     ┌──────────────────┐
                                     │  ESP32 + AS608    │
                                     │  Fingerprint      │
                                     │  - Enroll         │
                                     │  - Verify (1:N)   │
                                     │  - Delete         │
                                     │  - Template Store │
                                     └──────────────────┘
```

## User Flow

### 1. Online Registration (Web)
```
Resident → Web App → Fill form (name, address, contact)
         → Submit → Supabase Auth registers user
         → OTP sent via SMS (Semaphore API)
         → Verify OTP → Account created (status: pending_activation)
```

### 2. Account Activation (In-Person at Barangay Hall)
```
Resident arrives at barangay hall → Staff opens resident record
→ Kiosk fingerprint enrollment → ESP32 stores template
→ Staff marks account as "activated"
→ Resident can now book appointments online
```

### 3. Online Booking (Web)
```
Activated resident → Login → Browse services → Pick date/time
→ Conflict detection check → Confirm → Appointment created
→ Reference # + QR generated → SMS confirmation sent
```

### 4. Kiosk Check-In (On Appointment Day)
```
Resident → Kiosk touchscreen → "Place finger on scanner"
→ ESP32 matches fingerprint → Returns resident ID
→ RPi4 looks up today's appointment → Shows confirmation
→ Staff notified → Status: checked_in
```

## Data Flow: Fingerprint Verification

```
Kiosk Python    ────UART────▶  ESP32 C++
App                            Firmware
                     ──→      "VERIFY" command (ASCII)
                     ←──      "OK:<template_id>" or "NO_MATCH"
                     
RPi4: sends "VERIFY" to ESP32
ESP32: AS608 searches enrolled templates (1:N)
       Returns template ID (0-2999) on match
RPi4: Looks up resident by fingerprint_id in Supabase
      Checks if resident has an appointment today
      Displays result on touchscreen
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| **Web Frontend** | Next.js 15 (App Router) + Tailwind CSS 4 + TypeScript |
| **Web Backend** | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |
| **SMS/OTP** | Semaphore PH SMS API (via Supabase Edge Function) |
| **Deployment** | Vercel (web) |
| **Kiosk App** | Python 3 + customtkinter + pyserial + supabase-py |
| **Kiosk OS** | Raspberry Pi 4 (Raspberry Pi OS Lite) |
| **Fingerprint** | ESP32 + AS608 (custom Arduino firmware) |
| **Firmware Env** | PlatformIO (Arduino framework) |
| **UART Protocol** | Custom ASCII text protocol over Serial |

## Project Structure

```
smart-appointment-scheduling-kiosk/
├── src/
│   ├── web/          # Next.js application (Vercel)
│   │   ├── app/      # App Router pages
│   │   │   ├── (public)/    # Landing, login, register, booking
│   │   │   ├── (dashboard)/ # Resident dashboard
│   │   │   └── admin/       # Staff admin panel
│   │   ├── components/
│   │   ├── lib/       # Supabase clients, utils
│   │   └── ...
│   ├── rpi/          # Python kiosk app (Raspberry Pi 4)
│   │   ├── app.py        # Main entry point
│   │   ├── ui/           # CustomTkinter touchscreen UI
│   │   ├── serial_handler.py  # UART comm with ESP32
│   │   ├── supabase_client.py # Supabase integration
│   │   └── config.yaml
│   └── esp/          # ESP32 firmware (PlatformIO)
│       ├── src/
│       │   └── main.cpp     # UART command handler + AS608
│       ├── lib/
│       │   └── Adafruit_Fingerprint/
│       ├── include/
│       │   └── commands.h   # UART protocol definitions
│       └── platformio.ini
├── docs/             # Documentation
│   ├── architecture-overview.md
│   ├── api-spec.md
│   ├── database-schema.md
│   ├── uart-protocol.md
│   ├── setup-guide.md
│   ├── deployment.md
│   ├── development-log.md
│   └── images/       # Architecture diagrams
├── supabase/
│   ├── schema.sql
│   ├── seed.sql
│   ├── migrations/
│   └── edge-functions/
│       └── send-otp/
└── README.md
```

## Key Constraints

1. **No walk-in flow** — All appointments must be pre-booked online
2. **Internet required** for booking — Residents need internet to schedule
3. **Account activation** — Must visit barangay hall to activate + enroll fingerprint
4. **Fingerprint templates on ESP32** — Not in cloud DB (privacy + offline verification)
5. **Hybrid deployment** — Web on Vercel, kiosk connects to same Supabase DB