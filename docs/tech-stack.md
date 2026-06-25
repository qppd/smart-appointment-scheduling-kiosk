# Technology Stack & Libraries

## Overview

This document catalogs every technology, framework, library, and tool used in the Smart Appointment Scheduling Kiosk system, organized by component tier.

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
| **Vercel** | Static site hosting, edge deployment |
| **vercel.json**ttings | Vercel project configuration |

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
| **firebase-admin** | ^6.5.0 | Firebase Admin SDK (server-side) |

### Serial Communication

| Technology | Version | Purpose |
|------------|---------|---------|
| **pyserial** | ^3.5 | Cross-platform serial port access |

### Configuration

| Technology | Version | Purpose |
|------------|---------|---------|
| **python-dotenv** | ^1.0.1 | Load environment variables from .env |
| **setuptools** | latest | Python package utilities |

---

## Tier 3: ESP32 Firmware

### Platform & Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Arduino Core for ESP32** | Latest | ESP32 board support package |

### Libraries

| Technology | Version | Purpose |
|------------|---------|---------|
| **Adafruit Fingerprint Sensor Library** | Latest | AS608 sensor communication |
| **Adafruit BusIO** | Latest | I2C/SPI bus abstraction (dependency) |

### Development Tools

| Technology | Purpose |
|------------|---------|
| **Arduino IDE 2.x** | Firmware development and flashing |
| **USB-to-Serial (CP2102/CH340)** | ESP32 programming interface |

---

## Tier 4: Firebase Cloud Platform

| Service | Purpose | Pricing Tier |
|---------|---------|-------------|
| **Firebase Authentication** | Email/password user authentication | Spark (Free) |
| **Firebase Realtime Database** | NoSQL real-time data storage | Spark (Free) |
| **Firebase Admin SDK** | Server-side database access | N/A (service account) |

---

## Tier 5: Hardware

| Component | Model | Specifications |
|-----------|-------|---------------|
| **Single Board Computer** | Raspberry Pi 4 | 4GB RAM, 1.5GHz Quad-core, GPIO |
| **Microcontroller** | ESP32 Dev Module | 240MHz Dual-core, Wi-Fi/Bluetooth, GPIO |
| **Fingerprint Sensor** | AS608 | Optical, 57600 baud, 162 template capacity |
| **Display** | 7-inch Touchscreen LCD | HDMI/DSI interface |
| **Storage** | MicroSD Card 32GB | Raspberry Pi OS, application data |
| **Power Supply** | 5V/3A USB-C | RPi4 power |
| **Cables** | Micro USB Cable | ESP32 to RPi4 communication |

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
| **Firebase** | Real-time sync, auth, no backend server needed, free tier |
| **customtkinter** | Modern UI for Python, easy touchscreen support |
| **firebase-admin (Python)** | Server-side Firebase access with elevated privileges |
| **pyserial** | De facto standard for Python serial communication |
| **ESP32 + Arduino** | Strong community, built-in Wi-Fi/Bluetooth, cost-effective |
| **AS608 Sensor** | Low cost, widely documented, Arduino library support |
| **Tailwind CSS** | Rapid UI development, consistent design system |
| **TypeScript** | Type safety, better IDE support, reduced runtime errors |
