# System Architecture

## Overview

The Smart Appointment Scheduling Kiosk is a distributed system designed for Barangay (community-level government) service management in the Philippines. The system enables residents to book appointments online and check in via biometric fingerprint scanning at a physical kiosk. It consists of four primary architectural tiers: **Web Application**, **Cloud Services (Firebase)**, **Raspberry Pi Kiosk**, and **Embedded Hardware (ESP32 + Fingerprint Sensor)**.

## High-Level Architecture

```
                              +--------------------------------------------------+
                              |                                                  |
                              |              CLOUD INFRASTRUCTURE                |
                              |                                                  |
     +------------------+     |   +------------------------------------------+  |
     |                  |     |   |                                          |  |
     |  Web Application |     |   |         Firebase Platform                |  |
     |  (Next.js 14)    |     |   |                                          |  |
     |  - React 18      |     |   |  +------------------+  +---------------+ |  |
     |  - TypeScript    |     |   |  | Authentication     |  | Realtime      | |  |
     |  - Tailwind CSS  |     |   |  | (Email/Password)   |  | Database      | |  |
     |                  |-----|----->|                    |  | (RTDB)        | |  |
     |  Deployed to     |     |   |  +------------------+  +---------------+ |  |
     |  Vercel          |     |   |                                          |  |
     |                  |     |   +------------------------------------------+  |
     +------------------+     |                                                  |
            | A                +--------------------------------------------------+
            | i                    /\  |  \/
            | r                    |       |
            |                      |       |
            | M                    |       |
            | o                    |       |
            | n                    |       |
            | i                    |       |
            | t                 +---+       +---+
            | o                 |               |
            | r                 |               |
            | e                 v               v
            | d                 |               |
            |                   |               |
            |              +----------+     +-----------+
            |              | RPi4     |     | RPi4      |
            |              | Kiosk    |     | Kiosk     |
            |              | (Python  |     | (Python   |
            |              |  Tkinter)|     |  Tkinter) |
            |              +-----+----+     +-----+-----+
            |                    |               |
            |                    |  Serial       |
            |                    |  (USB/COM)    |
            |                    v               v
            |              +----------------------------+
            |              |                            |
            |              |    ESP32 + AS608 Sensor    |
            |              |    - Fingerprint Scanning  |
            |              |    - Template Storage      |
            |              |    - UART Communication    |
            |              |                            |
            |              +----------------------------+
            |
     +------v------+
     |  Resident   |
     |  (Web User) |
     +-------------+
```

## Architectural Layers

### 1. Presentation Layer (Web App)

The Web Application is the primary user-facing component, built with modern frontend technologies and deployed as a static site on Vercel.

| Aspect | Specification |
|--------|--------------|
| **Framework** | Next.js 14 with App Router |
| **Language** | TypeScript 5.5 |
| **Styling** | Tailwind CSS sound |
| **State Management** | React Context API (AuthContext) |
| **Deployment** | Vercel (Serverless/Edge) |
| **Target Users** | Residents, Admins |

**Pages & Functionality:**
- `page.tsx` (Landing) - Public introduction
- `login/page.tsx` - Authentication
- `register/page.tsx` - Account creation
- `booking/page.tsx` - Multi-step appointment booking
- `my-appointments/page.tsx` - Manage appointments & OTP enrollment
- `profile/page.tsx` - Resident profile management
- `kiosk/page.tsx` - Public queue display board
- `dolores-taytay-admin/page.tsx` - Administrator dashboard
- `settings/page.tsx` - System settings

### 2. Cloud Services Layer (Firebase)

Firebase serves as the central data hub, providing real-time synchronization, authentication, and storage.

| Service | Purpose |
|---------|---------|
| **Firebase Authentication** | Email/password authentication for residents and admins |
| **Firebase Realtime Database (RTDB)** | Real-time data storage and sync across all clients |
| **Firebase Admin SDK** | Server-side access from RPi kiosk application |

**Real-time Capabilities:**
- `onValue()` listeners on the web app for live queue updates
- `pyrebase4` polling (2-second interval) on RPi for commands
- Bidirectional data flow ensures all components stay synchronized

### 3. Kiosk Application Layer (Raspberry Pi 4)

The RPi4 runs a Python application with a custom Tkinter GUI, acting as the bridge between the cloud and embedded hardware.

| Aspect | Specification |
|--------|--------------|
| **Runtime freezing** | Python 3 |
| **GUI Framework** | customtkinter (modern themed tkinter) |
| **Database Access** | firebase-admin (Admin SDK) |
| **Serial Communication** | pyserial (115200 baud) |
| **Deployment** | systemd service (auto-start on boot) |

**Key Modules:**
- `gui/app.py` - Main application orchestrator
- `gui/screens/home.py` - Home screen with queue display
- `gui/screens/verify.py` - Fingerprint verification with animation
- `gui/screens/enroll.py` - Fingerprint enrollment
- `gui/screens/otp_enroll.py` - OTP-based self-enrollment
- `gui/screens/result.py` - Check-in result display
- `gui/screens/admin.py` - PIN-protected admin panel
- `services/serial_handler.py` - UART auto-reconnect serial communication
- `services/command_processor.py` - Maps RTDB commands to ESP32

### 4. Embedded Hardware Layer (ESP32 + AS608)

The ESP32 microcontroller handles fingerprint sensor operations, managed by the RPi4 via serial communication.

| Component | Role |
|-----------|------|
| **ESP32 Dev Module** | Microcontroller for sensor control and UART communication |
| **AS608 Fingerprint Sensor** | Optical fingerprint scanning and template storage (up to 162 templates) |
| **Communication** | Serial over micro USB (115200 baud) |

**Key Functions:**
- Fingerprint enrollment (capture and store templates)
- Fingerprint verification (1:N matching)
- Template deletion and counting
- Status reporting to RPi4

## Data Flow Architecture

```
     +------------------+                           +------------------+
     |   Web App        |                           |   RPi4 Kiosk     |
     |   (Next.js)      |                           |   (Python)       |
     +--------+---------+                           +--------+---------+
              |                                              |
              | HTTPS/REST                                   | Serial
              |                                                | (115200 baud)
              v                                                v
     +--------+---------+                             +------+------+
     |                  |                             | ESP32       |
     | Firebase RTDB    |                             | +AS608      |
     |                  |                             | Sensor      |
     +--------+---------+                             +-------------+
              |                                                |
              | Real-time Listeners                            | Fingerprint
              |                                                | Operations
              v                                                v
     +--------+---------+                             +------+------+
     |                  |                             | Templates   |
     | users/           |                             | stored on   |
     | services/        |                             | sensor flash|
     | appointments/    |                             +-------------+
     | kiosk_commands/  |
     | kiosk_status/  |
     +------------------+
```

## Communication Protocols

### Web App to Firebase RTDB
- **Protocol:** HTTPS/REST + WebSocket (Firebase SDK)
elijah - **Authentication:** Firebase Auth JWT tokens
- **Data Format:** JSON
- **Update Mechanism:** Real-time listeners (`onValue`, `onChildAdded`)

### RPi4 to Firebase RTDB
- **Protocol:** HTTPS REST (via firebase-admin or pyrebase4)
- **Authentication:** Service account JSON (Admin SDK)
- **Polling Strategy:** 2-second interval on `kiosk_commands`
- **Updates:** Direct REST API writes to RTDB nodes

### RPi4 to ESP32 (Serial/UART)
- **Protocol:** USB Serial (UART)
- **Baud Rate:** 115200
- **Data Format:** Plain text commands (e.g., `ENROLL:5`, `VERIFY`, `DELETE:3`)
- **Auto-reconnect:** Serial handler monitors connection and attempts reconnection

### ESP32 to AS608 Fingerprint Sensor
- **Protocol:** UART (SoftwareSerial or HardwareSerial)
- **Baud Rate:** 57600 (AS608 default)
- **Library:** Adafruit Fingerprint Sensor Library
- **Functions:** `getImage()`, `image2Tz()`, `createModel()`, `storeModel()`, `fingerFastSearch()`

## Deployment Architecture

```
                                Production Environment
                    +------------------------------------------------+
                    |                                                |
                    |   +--------------------------------+           |
                    |   |         Vercel Edge Network     |           |
                    |   |    (Next.js Static Export)      |           |
                    |   +--------------------------------+           |
                    |                |                               |
                    |                v                               |
                    |   +--------------------------------+           |
                    |   |      Firebase Platform         |           |
                    |   |  - Auth (Email/Password)       |           |
                    |   |  - RTDB                          |           |
                    |   +--------------------------------+           |
                    |                |                               |
                    |                v                               |
                    |   +--------------------------------+           |
                    |   |     Raspberry Pi 4 (Local)      |           |
                    |   |  - customtkinter GUI            |           |
                    |   |  - Serial to ESP32               |           |
                    |   +--------------------------------+           |
                    |                |                               |
                    |                v                               |
                    |   +--------------------------------+           |
                    |   |     ESP32 + AS608               |           |
                    |   |  - Fingerprint ops                |           |
                    |   +--------------------------------+           |
                    |                                                |
                    +------------------------------------------------+
```

## Security Architecture

| Layer | Security Measures |
|-------|-------------------|
| **Web App** | Firebase Auth (JWT), HTTPS, Role-based access (resident/admin) |
| **Firebase RTDB** | Security rules (JSON-based access control), Admin SDK for server ops |
| **RPi4** | Service account JSON (not committed), systemd isolation, environment variables |
| **Serial/UART** | Physical-only access (micro USB), no network exposure |
| **Fingerprint Data** | Templates stored on AS608 flash (never transmitted as raw images) |

## Scalability Considerations

- **Web App:** Vercel serverless automatically scales
- **Firebase RTDB:** NoSQL real-time database scales with Firebase infrastructure
- **RPi4:** Single kiosk per deployment; multiple kiosks can connect to the same RTDB
- **ESP32:** Local processing; sensor capacity ~162 fingerprint templates

## Monitoring & Logging

| Component | Monitoring |
|-----------|-----------|
| Web App | Vercel analytics, Browser console logs |
| Firebase | Firebase console (real-time database viewer, auth logs) |
| RPi4 | systemd journal (`journalctl -u kiosk-firebase -f`), application logs |
| ESP32 | Serial monitor (Arduino IDE) for debugging |
