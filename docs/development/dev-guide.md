# Development Guide

## Project Structure

```
smart-appointment-scheduling-kiosk/
  src/
    web/            # Web application (React + FastAPI)
      frontend/     # React frontend (Vite + Tailwind)
      backend/      # FastAPI backend
      docker-compose.yml
      vercel.json
    rpi/            # RPi4 kiosk software (Python Tkinter)
      main.py
      services/     # API client, serial handler
      ui/           # Touchscreen UI screens
    esp/            # ESP32 firmware
      fingerprint_controller.ino
  docs/
    setup/          # Setup guides
    api/            # API documentation
    database/       # Database schema
    hardware/       # Hardware wiring and setup
    development/    # Development guides
  README.md
```

## Architecture

### Hybrid Deployment Model

```
[Vercel / Web Browser]
      | (HTTPS)
      v
[FastAPI Backend + PostgreSQL]  <-->  [RPi4 Kiosk + ESP32 + AS608]
      |
      v
[Supabase / VPS]
```

- **Frontend** deployed on Vercel
- **Backend** running on a VPS or the Supabase ecosystem
- **RPi4 Kiosk** at barangay hall communicates with backend API
- **ESP32** handles fingerprint operations locally on the kiosk

### User Flow

1. **Register** online (name, contact, address, password)
2. **Verify OTP** via SMS
3. **Visit barangay hall** for activation + fingerprint enrollment
4. **Book appointments** online (requires active + enrolled)
5. **Check in** at kiosk using fingerprint on appointment day

## Conflict Detection

Server-side validation prevents double-booking:
- Checks overlapping time ranges for same service + date
- Enforces per-service slot capacity
- Uses optimistic locking on time_slots.version

## Security

- **Passwords:** bcrypt hashing
- **JWT:** 24-hour tokens with HS256
- **Fingerprint:** Templates stored on ESP32 flash (never in DB as raw data)
  - Backend only stores template ID reference
- **API:** Bearer token authentication on all protected routes
- **OTP:** 6-digit code, 10-minute expiry

## Testing

```bash
# Backend
cd src/web/backend
pytest

# Frontend
cd src/web/frontend
npm test

# ESP32
# Upload via Arduino IDE, then test with Serial Monitor at 115200 baud
# See src/esp/README.md for detailed instructions
```
