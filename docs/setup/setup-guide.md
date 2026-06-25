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

# Install packages
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
4. Insert the MicroSD card into your Raspberry Pi 4
5. Boot up with Ethernet or Wi-Fi configured

### 3.2 Enable Serial Port

```bash
# Open raspi-config
sudo raspi-config
```

Navigate to: **Interface Options > Serial Port**
- Select **No** for "Login shell over serial"
- Select **Yes** for "Serial port hardware"

```bash
# Reboot
sudo reboot
```

### 3.3 Install Python Dependencies

```bash
# On the Raspberry Pi
cd src/rpi

# Install Python 3 and pip (if not already installed)
sudo apt update
sudo apt install -y python3-pip python3-tk  python3-venv git

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
# Firebase service account path
FIREBASE_CREDENTIALS=/path/to/firebase-service-account.json

# Firebase project details
FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com

# Serial port for ESP32
SERIAL_PORT=/dev/ttyUSB0
SERIAL_BAUD=115200

# Kiosk identification
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
- **Adafruit Fingerprint Sensor Library**
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

| Step | Check | Status |
|------|-------|--------|
| Firebase project created | Yes / No | |
| Email/Password auth enabled | Yes / No | |
| RTDB security rules set | Yes / No | |
| Web app env vars configured | Yes / No | |
| Web app runs locally | Yes / No | |
| Web app deployed to Vercel | Yes / No | |
| RPi4 OS installed and booted | Yes / No | |
| Serial port enabled on RPi4 | Yes / No | |
| Python packages installed | Yes / No | |
| RPi4 .env configured | Yes / No | |
| ESP32 connected to RPi4 | Yes / No | |
| AS608 wired to ESP32 | Yes / No | |
| ESP32 firmware uploaded | Yes / No | |
| Serial monitor shows "OK:ESP32 ready" | Yes / No | |
| systemd service active | Yes / No | |
| Web app can send commands to kiosk | Yes / No | |
| Fingerprint enrollment works | Yes / No | |
| Fingerprint verification works | Yes / No | |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| RPi4 cannot connect to Firebase | Check `.env` values; verify internet; check service account JSON permissions |
| ESP32 not detected | Check `ls /dev/ttyUSB*` or `ls /dev/ttyACM*`; try different USB cable/port |
| AS608 sensor not responding | Verify wiring (VCC to 3.3V); check baud rate (57600); check GND connection |
| Web app cannot write to RTDB | Check security rules; ensure user is authenticated |
| Touchscreen not working | Check HDMI and USB connections; calibrate if needed |
| systemd service fails to start | Run `sudo journalctl -u kiosk-firebase -f` to see error |
| ESP32 watchdog reset | Add `delay()` or `yield()` in loops; ensure stable power supply |
| "Permission Denied" in RTDB | Check security rules; ensure auth is active |
