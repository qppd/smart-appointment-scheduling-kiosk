# Development Guide

## Project Structure

```
smart-appointment-scheduling-kiosk/
├── src/
│   ├── web/                 # Next.js 14 web application
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── src/
│   │       ├── app/         # Next.js App Router pages
│   │       ├── lib/         # Firebase, auth, rtdb utilities
│   │       ├── types/       # TypeScript type definitions
│   │       └── components/  # Shared UI components
│   ├── rpi/                 # Raspberry Pi 4 kiosk application
│   │   ├── main.py          # Entry point
│   │   ├── requirements.txt
│   │   ├── .env             # Environment variables (not in git)
│   │   ├── gui/             # Tkinter GUI screens
│   │   └── services/        # Firebase, serial handlers
│   └── esp/                 # ESP32 firmware
│       ├── README.md
│       ├── uart_protocol.md
│       └── fingerprint_controller/
│           ├── fingerprint_controller.ino
│           ├── FingerprintAS608.cpp
│           └── FingerprintAS608.h
├── docs/                    # Documentation
│   ├── system-architecture.md
│   ├── components.md
│   ├── tech-stack.md
│   ├── flow-diagrams.md
│   ├── specifications.md
│   ├── software-requirements.md
│   ├── api/
│   ├── database/
│   ├── development/
│   ├── hardware/
│   ├── rpi-systemd/
│   └── setup/
└── model/                   # 3D enclosure renders
```

## Development Workflow

### 1. Web Application

```bash
cd src/web

# Install dependencies
npm install

# Start development server
npm run dev          # http://localhost:3000

# Build for production (static export)
npm run build        # Outputs to `dist/` or `out/`
```

**Key development commands:**
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server with hot reload |
| `npm run build` | Build static export |
| `npm run start` | Start production server (if using SSR) |
| `npm run lint` | Run ESLint |

### 2. RPi4 Kiosk

```bash
cd src/rpi

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Linux/macOS
# or: venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your Firebase credentials

# Run the kiosk GUI
python main.py
```

### 3. ESP32 Firmware

```bash
# Open Arduino IDE
# File > Open > src/esp/fingerprint_controller/fingerprint_controller.ino

# Select board: Tools > Board > ESP32 Arduino > ESP32 Dev Module
# Select port: Tools > Port > (your ESP32 port)

# Upload the sketch
# Tools > Serial Monitor (set to 115200 baud)
```

**Serial commands to test:**
```
ENROLL:5      # Enroll fingerprint to template ID 5
VERIFY        # Verify any finger (1:N match)
DELETE:5      # Delete template ID 5
LIST          # List all stored template IDs
COUNT         # Get total template count
STATUS        # Get ESP32 status
```

## Architecture

```
[Web Browser]  --HTTPS/WSS-->  [Firebase Platform]  <--HTTPS--  [RPi4 Kiosk]
                                                                   |
                                                                   | Serial
                                                                   v
                                                            [ESP32 + AS608]
```

### Communication Model

1. **Web App <-> Firebase**: Real-time bidirectional sync using Firebase SDK (WebSocket)
2. **RPi4 <-> Firebase**: HTTPS REST polling (2-second interval) using firebase-admin
3. **RPi4 <-> ESP32**: USB Serial at 115200 baud using pyserial
4. **ESP32 <-> AS608**: UART at 57600 baud using Adafruit library

## Technology Selection

| Choice | Rationale |
|--------|-----------|
| **Firebase (BaaS)** | No backend server to maintain; real-time sync out of the box; generous free tier |
| **Next.js Static Export** | Fast, SEO-friendly, deployable to any static host (Vercel) |
| **customtkinter** | Modern styled GUI for Python, easy touchscreen support |
| **ESP32 + AS608** | Low cost, well-documented, community support |
| **RPi4** | Runs full Linux, Python, has GPIO, touchscreen support |

## Code Conventions

### Web (TypeScript/React)
- Use functional components with hooks
- Put all Firebase operations in `src/lib/rtdb.ts`
- Use `AuthContext` for global auth state
- Prefer `onValue()` for real-time data that needs to sync
- Prefer `get()` for one-time reads

### RPi (Python)
- Keep screen logic in `gui/screens/*.py`
- Put all serial communication in `services/serial_handler.py`
- Use `config.py` for all constants (colors, fonts, timings)
- Handle serial disconnections gracefully with auto-reconnect

### ESP32 (Arduino C++)
- Keep sensor logic in the `FingerprintAS608` class
- Use `Serial.println()` for sending responses to RPi4
- Include `yield()` in long loops to prevent watchdog resets
- Match baud rate with RPi4 serial handler (115200)

## Testing Strategy

### Web Application
- Manual testing in Chrome, Firefox, Safari
- Test on mobile viewport (responsive design)
- Verify Firebase real-time sync with multiple browsers open

### RPi4 Kiosk
- Test serial auto-reconnect by unplugging and replugging ESP32
- Test touch input on actual touchscreen
- Test kiosk boot with systemd service

### ESP32 Firmware
- Upload firmware and verify in Serial Monitor
- Test each command: ENROLL, VERIFY, DELETE, LIST, COUNT
- Check for watchdog resets after long idle periods

## Environment Variables

### Web (`.env.local`)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
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

## Git Workflow

```bash
# 1. Create a feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: description of changes"

# 3. Push and create PR
git push origin feature/my-feature
# Create a Pull Request on GitHub
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| RPi4 cannot connect to Firebase | Check `.env` creds; verify internet; run `systemctl status kiosk-firebase` |
| ESP32 not detected | Check `ls /dev/ttyUSB*` or `ls /dev/ttyACM*`; try different USB cable |
| Web app Firebase errors | Ensure all `NEXT_PUBLIC_*` env vars are set; check Firebase console |
| Touchscreen not responding | Calibrate touchscreen; check HDMI/USB connections |
| Fingerprint sensor not working | Verify wiring (VCC to 3.3V); check serial baud (57600 for AS608) |
| Watchdog reset on ESP32 | Add `yield()` in loops; ensure stable power supply |
