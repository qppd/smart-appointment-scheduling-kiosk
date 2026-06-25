# Development Guide

## Project Structure

```mermaid
graph TD
    subgraph ROOT["smart-appointment-scheduling-kiosk/"]
        SRC["src/"]
        DOCS["docs/"]
        MODEL["model/"]
    end

    subgraph Web["src/web/"]
        W1["Next.js 14 App"]
        W2["lib/"]
        W3["components/"]
        W4["types/"]
    end

    subgraph RPi["src/rpi/"]
        R1["main.py"]
        R2["gui/"]
        R3["services/"]
    end

    subgraph ESP["src/esp/"]
        E1["fingerprint_controller.ino"]
        E2["FingerprintAS608.cpp/.h"]
    end

    subgraph Documentation["docs/"]
        D1["system-architecture.md"]
        D2["components.md"]
        D3["tech-stack.md"]
        D4["flow-diagrams.md"]
        D5["specifications.md"]
        D6["software-requirements.md"]
        D7["api/"]
        D8["database/"]
        D9["development/"]
        D10["hardware/"]
        D11["setup/"]
    end

    SRC --> Web & RPi & ESP
    ROOT --> DOCS & MODEL
    DOCS --> Documentation

    style ROOT fill:#e3f2fd,stroke:#1565c0
    style Web fill:#e8f5e9,stroke:#2e7d32
    style RPi fill:#fff3e0,stroke:#e65100
    style ESP fill:#f3e5f5,stroke:#7b1fa2
    style Documentation fill:#fce4ec,stroke:#c2185b
```

---

## Development Workflow

### 1. Web Application

```bash
cd src/web
npm install
npm run dev          # http://localhost:3000
npm run build        # Static export
```

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build static export |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

### 2. RPi4 Kiosk

```bash
cd src/rpi
pip install -r requirements.txt
python main.py
```

### 3. ESP32 Firmware

Open Arduino IDE and select: `src/esp/fingerprint_controller/fingerprint_controller.ino`

| Setting | Value |
|---------|-------|
| Board | ESP32 Dev Module |
| Upload Speed | 921600 baud |
| Port | (your COM port) |
| Flash Mode | QIO |
| Flash Size | 4MB |

---

## Architecture

```mermaid
graph TD
    subgraph Web["Web (Vercel)"]
        W["Next.js 14 + React + Tailwind"]
    end

    subgraph Firebase["Firebase (Google Cloud)"]
        A["Authentication"]
        B["Realtime Database"]
    end

    subgraph Local["Local (Barangay Hall)"]
        R["Raspberry Pi 4\nPython + customtkinter"]
        E["ESP32 + AS608\nFingerprint Sensor"]
    end

    W <-->|HTTPS/WSS| A
    W <-->|HTTPS/WSS| B
    R <-->|HTTPS REST| B
    R <-->|Serial USB| E

    style Web fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style Firebase fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style Local fill:#fff3e0,stroke:#e65100,stroke-width:2px
```

---

## User Flow

```mermaid
flowchart LR
    A["Register Online"] --> B["Verify OTP via SMS"]
    B --> C["Visit Barangay for Activation + Enrollment"]
    C --> D["Book Appointments Online"]
    D --> E["Check-in at Kiosk\n(Fingerprint)"]

    style E fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

---

## Testing Strategy

### Web Application
- Manual testing in Chrome, Firefox, Safari
- Test responsive design on mobile viewport
- Verify Firebase real-time sync with multiple browsers

### RPi4 Kiosk
- Test serial auto-reconnect by unplugging/replugging ESP32
- Test touch input on actual touchscreen
- Test kiosk boot with systemd service

### ESP32 Firmware
- Upload firmware and verify in Serial Monitor
- Test each command: ENROLL, VERIFY, DELETE, LIST, COUNT
- Check for watchdog resets after long idle periods

---

## Environment Variables

### Web (`.env.local`)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
```

### RPi (`.env`)
```bash
FIREBASE_CREDENTIALS=/path/to/firebase-service-account.json
FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
SERIAL_PORT=/dev/ttyUSB0
SERIAL_BAUD=115200
KIOSK_ID=kiosk_main
```

---

## Git Workflow

```mermaid
flowchart LR
    A["main branch"] --> B["feature/my-feature"]
    B --> C["Pull Request"]
    C --> D["Code Review"]
    D --> E["Merge to main"]
    E --> F["Deploy to Vercel"]

    style A fill:#e3f2fd,stroke:#1565c0
    style F fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| RPi4 cannot connect to Firebase | Check `.env` creds; verify internet; check service account JSON permissions |
| ESP32 not detected | Check `ls /dev/ttyUSB*` or `ls /dev/ttyACM*`; try different USB cable/port |
| AS608 sensor not responding | Verify wiring (VCC to 3.3V); check baud rate (57600); check GND connection |
| Web app cannot write to RTDB | Check security rules; ensure user is authenticated |
| Touchscreen not working | Check HDMI and USB connections; calibrate if needed |
| systemd service fails to start | Run `sudo journalctl -u kiosk-firebase -f` to see error |
| ESP32 watchdog622 watchdog reset | Add `delay()` or `yield()` in loops; ensure stable power supply |
