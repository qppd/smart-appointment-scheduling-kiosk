# Setup Guide

## Prerequisites

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | 18+ | For web application |
| npm | 9+ | Bundled with Node.js |
| Python | 3.12+ | For RPi4 kiosk |
| pip | Latest | Python package manager |
| Arduino IDE | 2.x | For ESP32 firmware |
| Raspberry Pi 4 | 4GB | With Raspberry Pi OS Lite |
| ESP32 Dev Module | Any | With USB cable |
| AS608 Sensor | Any | Optical fingerprint sensor |
| Touchscreen | 7-inch | HDMI + USB for RPi4 |

---

## Setup Flow Overview

```mermaid
flowchart TB
    subgraph Phase1["Phase 1: Cloud Setup"]
        A["Create Firebase Project"] --> B["Enable Auth + RTDB"]
        B --> C["Configure Security Rules"]
    end

    subgraph Phase2["Phase 2: Web Application"]
        D["Install Dependencies"] --> E["Configure .env.local"]
        E --> F["Develop & Test Locally"]
        F --> Gtrs to] G["Deploy to Vercel"]
    end

    subgraph Phase3["Phase 3: RPi4 Kiosk"]
        H["Flash Raspberry Pi OS"] --> I["Enable Serial Port"]
        I --> J["Install Python Packages"]
        J --> K["Configure .env"]
        K --> L["Set up systemd Service"]
    end

    subgraph Phase4["Phase 4: ESP32 Firmware"]
        M["Install Arduino IDE + ESP32 Support"] --> N["Wire AS608 to ESP32"]
        N --> O["Upload firmware_controller.ino"]
    end

    subgraph Phase5["Phase 5: Verification"]
        P["Test booking flow"] --> Q["Test fingerprint check-in"]
        Q --> R["Verify real-time sync"]
    end

    Phase1 --> Phase2 --> Phase3 --> Phase4 --> Phase5

    style Phase1 fill:#e3f2fd,stroke:#1565c0
    style Phase2 fill:#e8f5e9,stroke:#2e7d32
    style Phase3 fill:#fff3e0,stroke:#e65100
    style Phase4 fill:#f3e5f5,stroke:#7b1fa2
    style Phase5 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

---

## 1. Firebase Setup

Before deploying the web app or kiosk, you need to create and configure a Firebase project.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project** and follow the wizard
3. Once created, go to **Project Settings > General**
4. Copy the Firebase config (API Key, Auth Domain, etc.)
5. Go to **Authentication > Sign-in method** and enable **Email/Password**
6. Go to **Realtime Database** and create a new database
7. Set the security rules to:
   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "auth != null && auth.uid === $uid",
           ".write": "auth != null && auth.uid === $uid"
         }
       },
       "services": {
         ".read": true,
         ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
       },
       "appointments": {
         ".read": "auth != null",
         "$appointmentId": {
           ".write": "auth != null"
         }
       },
       "kiosk_commands": {
         ".read": "auth != null",
         ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
       },
       "kiosk_status": {
         ".read": true,
         ".write": true
       }
     }
   }
   ```
8. Create a **Service Account** for the RPi kiosk:
   - Go to **Project Settings > Service Accounts**
   - Click "Generate new private key"
   - Save the JSON file (you will need it for the RPi4)

---

## 2. Web Application Setup

### 2.1 Install Dependencies

```bash
cd src/web
npm install
```

### 2.2 Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Firebase config:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
```

### 2.3 Run Development Server

```bash
npm run dev
# Open http://localhost:3000 in your browser
```

### 2.4 Build and Deploy (Vercel)

```bash
# Build static export
npm run build

# Deploy to Vercel (requires Vercel CLI)
vercel --prod
```

---

## 3. RPi4 Kiosk Setup

### 3.1 Install Raspberry Pi OS

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Select **Raspberry Pi OS Lite (64-bit)**
3. Write to your MicroSD card (minimum 32GB)
4. Insert into your Raspberry Pi 4
5. Boot up with Ethernet or Wi-Fi configured

### 3.2 Enable Serial Port

```bash
sudo raspi-config
```

Navigate to: **Interface Options > Serial Port**
- **No** - "Would you like a login shell to be accessible over serial?"
- **Yes** - "Would you like the serial port hardware to be enabled?"

```bash
sudo reboot
```

### 3.3 Install Python Dependencies

```bash
cd src/rpi

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt
```

### 3.4 Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
FIREBASE_CREDENTIALS=/path/to/firebase-service-account.json
FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
SERIAL_PORT=/dev/ttyUSB0
SERIAL_BAUD=115200
KIOSK_ID=kiosk_main
```

### 3.5 Connect Hardware

1. Connect the AS608 sensor to the ESP32 (3.3V, GND, TX, RX)
2. Connect the ESP32 to the Raspberry Pi via USB cable
3. Connect the touchscreen to the RPi4 (HDMI + USB)
4. Power up all devices

### 3.6 Test the Kiosk

```bash
python3 main.py
```

The kiosk GUI should launch in fullscreen mode.

### 3.7 Set Up Auto-Start (systemd)

Create the systemd service file:

```bash
sudo cp docs/rpi-systemd/kiosk-firebase.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable kiosk-firebase
sudo systemctl start kiosk-firebase
```

Check the status:

```bash
sudo systemctl status kiosk-firebase
sudo journalctl -u kiosk-firebase -f
```

---

## 4. ESP32 Firmware Setup

### 4.1 Install Arduino IDE

1. Download [Arduino IDE 2.x](https://www.arduino.cc/en/software)
2. Install ESP32 board support:
   - Open **File > Preferences**
   - Add to **Additional Boards Manager URLs**:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to **Tools > Board > Boards Manager**
   - Search for "ESP32" and install by Espressif Systems

### 4.2 Install Libraries

Open **Tools > Manage Libraries** and install:
¼- **Adafruit Fingerprint Sensor Library**
- **Adafruit BusIO** (dependency)

### 4.3 Upload Firmware

```bash
# In Arduino IDE:
# File > Open > src/esp/fingerprint_controller/fingerprint_controller.ino

# Select board and port:
#   Tools > Board > ESP32 Arduino > ESP32 Dev Module
#   Tools > Port > (your ESP32 COM port)

# Click Upload
```

### 4.4 Verify Upload

Open **Tools > Serial Monitor** (set baud to **115200**).

You should see:
```
OK:ESP32 ready
```

---

## 5. Verification Checklist

Use this checklist to verify everything is set up correctly:

```mermaid
flowchart TB
    subgraph Checklist["Setup Verification"]
        direction TB
        A["Firebase project created"] --> B["Email/Password auth enabled"]
        B --> C["RTDB security rules set"]
        C --> D["Web app env vars configured"]
        D --> E["Web app runs locally"]
        E --> F["Web app deployed to Vercel"]
        F --> G["RPi4 OS installed and booted"]
        G --> H["Serial port enabled on RPi4"]
        H --> I["Python packages installed"]
        I --> J["RPi4 .env configured"]
        J --> K["ESP32 connected to RPi4"]
        K --> L["AS608 wired to ESP32"]
        L --> M["ESP32 firmware uploaded"]
        M --> N["Serial monitor shows OK:ESP32 ready"]
        N --> O["systemd service active"]
        O --> P["Web app can send commands to kiosk"]
        P --> Q["Fingerprint enrollment works"]
        Q --> R["Fingerprint verification works"]
    end

   共分 style R fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

| # | Step | Status |
|---|------|--------|
| 1 | Firebase project created | [ ] |
| 2 | Email/Password auth enabled | [ ] |
| 3 | RTDB security rules set | [ ] |
| 4 | Web app env vars configured | [ ] |
| 5 | Web app runs locally | [ ] |
| 6 | Web app deployed to Vercel | [ ] |
| 7 | RPi4 OS installed and booted | [ ] |
| 8 | Serial port enabled on RPi4 | [ ] |
| 9 | Python packages installed | [ ] |
| 10 | RPi4 .env configured | [ ] |
| 11 | ESP32 connected to RPi4 | [ ] |
| 12 | AS608 wired to ASP608 | [ ] |
| 13 | ESP32 firmware uploaded | [ ] |
| 14 | "OK:ESP32 ready" in Serial Monitor | [ ] |
| 15 | systemd service active | [ ] |
| 16 | Web app can send commands to kiosk | [ ] |
| 17 | Fingerprint enrollment works | [ ] |
| 18 | Fingerprint verification works | [ ] |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Web app Firebase errors | Ensure all `NEXT_PUBLIC_*` env vars are set; check Firebase console |
| RPi4 cannot connect to Firebase | Check `.env` values; verify internet; check service account JSON permissions |
| ESP32 not detected | Check `ls /dev/ttyUSB*` or `ls /dev/ttyACM*`; try different USB cable/port |
| AS608 sensor not responding | Verify wiring (VCC to 3.3V); check baud rate (57600); check GND connection |
| Touchscreen not working | Check HDMI and USB connections; calibrate if needed |
| systemd service fails to start | Run `sudo journalctl -u kiosk-firebase -f` to see error |
| "Permission Denied" in RTDB | Check security rules; ensure auth is active |
| ESP32 watchdog reset | Add `yield()` in loops; ensure stable power supply |
