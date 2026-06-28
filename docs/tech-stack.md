# Technology Stack & Libraries (Updated — Actual Codebase)

## Overview

This document catalogs every technology, framework, library, and tool used in the Smart Appointment Scheduling Kiosk system, organized by component tier. Updated to reflect the **actual built system** at `git HEAD`.

---

## Tier 1: Web Application

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | ^14.2.7 | React framework with App Router, static export |
| **React** | ^18.3.1 | UI library (component-based) |
| **React DOM** | ^18.3.1 | React DOM rendering |
| **TypeScript** | ^5.5.4 | Static typing for JavaScript |

### Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | ^3.4.10 | Utility-first CSS framework |
| **PostCSS** | ^8.4.41 | CSS processing (with autoprefixer) |
| **autoprefixer** | ^10.4.20 | CSS vendor prefix automation |

### Firebase Integration

| Technology | Version | Purpose |
|------------|---------|---------|
| **Firebase SDK** | ^10.13.0 | Firebase Web SDK (Auth + RTDB) |
| **react-firebase-hooks** | ^5.1.1 | React hooks for Firebase Auth |

### SMS Integration

| Technology | Version | Purpose |
|------------|---------|---------|
| **Semaphore.co API** | v4 | Philippine SMS gateway (HTTP API) |
| **Custom HTTP Client** | — | Retry with exponential backoff + jitter, phone normalization, structured logging |
| **HMAC-SHA256 OTP** | Node.js crypto | Stateless OTP tokens (no server storage) |

### Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| **date-fns** | ^3.6.0 | Date formatting and manipulation |
| **lucide-react** | ^0.439.0 | Icon library (SVG icons) |

### Type Definitions

| Technology | Version | Purpose |
|------------|---------|---------|
| **@types/node** | ^22.5.1 | TypeScript definitions for Node.js |
| **@types/react** | ^18.3.5 | TypeScript definitions for React |
| **@types/react-dom** | ^18.3.0 | TypeScript definitions for React DOM |

### Deployment

| Technology | Purpose |
|------------|---------|
| **Vercel** | Static site hosting + Serverless functions |
| **vercel.json** | Vercel project configuration |

---

## Tier 2: Raspberry Pi 4 Kiosk

### Core Runtime

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python 3** | 3.12+ | Application runtime |

### GUI Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **customtkinter** | ^5.2.2 | Modern themed tkinter widgets |
| **Pillow** | ^10.4.0 | Image processing (PIL fork) |

### Firebase Integration

| Technology | Version | Purpose |
|------------|---------|---------|
| **firebase-admin** | ^6.5.0 | Firebase Admin SDK (server-side service account) |

### Serial Communication

| Technology | Version | Purpose |
|------------|---------|---------|
| **pyserial** | ^3.5 | Cross-platform serial port access (115200 baud) |

### Configuration & Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| **python-dotenv** | ^1.0.1 | Load environment variables from .env |
| **setuptools** | latest | Python package utilities |

---

## Tier 3: ESP32 Firmware

### Platform & Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Arduino Core for ESP32** | Latest | ESP32 board support package (240MHz dual-core) |

### Firmware Files

| File | Purpose |
|------|---------|
| `fingerprint_controller.ino` | Main sketch: serial parser, 10 command handlers, monitor mode (327 lines) |
| `FingerprintAS608.h` | C++ wrapper header |
| `FingerprintAS608.cpp` | Adafruit library wrapper (enroll, verify, search, delete, count, list, clear) |

### Libraries

| Technology | Version | Purpose |
|------------|---------|---------|
| **Adafruit Fingerprint Sensor Library** | Latest | AS608 sensor communication (UART 57600 baud) |
| **Adafruit BusIO** | Latest | I2C/SPI bus abstraction (dependency) |

### Development Tools

| Technology | Purpose |
|------------|---------|
| **Arduino IDE 2.x** | Firmware development and flashing |
| **USB-to-Serial (CP2102/CH340)** | ESP32 programming interface |
| **Upload Speed** | 921600 baud |
| **Flash Mode** | QIO |
| **Flash Size** | 4MB |

---

## Tier 4: Firebase Cloud Platform

| Service | Purpose | Pricing Tier |
|---------|---------|-------------|
| **Firebase Authentication** | Email/password user authentication | Spark (Free) |
| **Firebase Realtime Database** | NoSQL real-time data storage | Spark (Free) |
| **Firebase Admin SDK** | Server-side database access (RPi4 service account) | N/A (service account) |

---

## Tier 5: SMS Notification

| Component | Purpose |
|-----------|---------|
| **Semaphore.co API v4** | Philippine SMS gateway |
| **Custom Semaphore Client** | Retry (max 2), exp. backoff (250ms base, 2s max), jitter, timeout (12s), phone redaction in logs |
| **HMAC OTP Store** | Stateless 6-digit OTP via `node:crypto` HMAC-SHA256, 5-min TTL, max 3 attempts |
| **Phone Normalization** | Accepts 09xx, +639xx, 639xx, 9xx formats |

---

## Tier 6: Hardware

| Component | Model | Specifications |
|-----------|-------|---------------|
| **Single Board Computer** | Raspberry Pi 4 | 4GB RAM, 1.5GHz Quad-core, GPIO, 7" touchscreen LCD |
| **Microcontroller** | ESP32 Dev Module | 240MHz Dual-core, Wi-Fi/Bluetooth, GPIO, 4MB flash |
| **Fingerprint Sensor** | AS608 | Optical, UART 57600 baud, 127 template capacity (configured max) |
| **Display** | 7-inch Touchscreen LCD | 1024x600 reference resolution, HDMI/USB or DSI |
| **Storage** | MicroSD Card 32GB | Raspberry Pi OS, application data |
| **Power Supply** | 5V/3A USB-C | RPi4 power |
| **Cables** | Micro USB Cable | ESP32 to RPi4 communication (Serial 115200) |

---

## Complete Dependency Inventory

### Web (package.json)

```json
{
  "dependencies": {
    "firebase": "^10.13.0",
    "lucide-react": "^0.439.0",
    "next": "^14.2.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-firebase-hooks": "^5.1.1",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@types/node": "^22.5.1",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.4"
  }
}
```

### RPi (requirements.txt)

```
firebase-admin==6.5.0
pyserial==3.5
python-dotenv==1.0.1
customtkinter==5.2.2
Pillow==10.4.0
setuptools
```

### ESP32 (Arduino Libraries)

```
Adafruit Fingerprint Sensor Library (via Library Manager)
Adafruit BusIO (dependency, via Library Manager)
```

---

## Technology Selection Rationale

| Technology | Rationale |
|------------|-----------|
| **Next.js 14** | Static export, App Router, fast performance, Vercel deployment |
| **Firebase RTDB** | Real-time sync (WebSocket native), auth, no backend server needed, free tier |
| **customtkinter** | Modern UI for Python, easy touchscreen support, responsive scaling |
| **firebase-admin (Python)** | Server-side Firebase access with elevated privileges (service account) |
| **pyserial** | De facto standard for Python serial communication, port auto-detect |
| **ESP32 + Arduino** | Strong community, built-in Wi-Fi/Bluetooth, cost-effective, 3.3V logic |
| **AS608 Sensor** | Low cost, widely documented, Arduino library support, optical sensor |
| **Semaphore.co** | Lowest cost for Philippine SMS, simple URL-encoded API, no monthly fees |
| **HMAC OTP (Stateless)** | No server storage needed, survives cold starts, uses existing API key |
| **Tailwind CSS** | Rapid UI development, consistent design system |
| **TypeScript** | Type safety, better IDE support, reduced runtime errors |
