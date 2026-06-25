# System Architecture

## Overview

The Smart Appointment Scheduling Kiosk is a distributed system designed for Barangay (community-level government) service management in the Philippines. The system enables residents to book appointments online and check in via biometric fingerprint scanning at a physical kiosk. It consists of four primary architectural tiers: **Web Application**, **Cloud Services (Firebase)**, **Raspberry Pi Kiosk**, and **Embedded Hardware (ESP32 + Fingerprint Sensor)**.

## High-Level Architecture

```mermaid
flowchart TD
    subgraph Cloud["**Cloud Infrastructure**"]
        F["**Firebase Platform**
        *Authentication*
        *Realtime Database*"]
    end

    WA["**Web Application**
*Next.js 14*
*React 18*
*TypeScript*
*Tailwind CSS*"]

    RPI["**Raspberry Pi 4 Kiosk**
*Python 3*
*customtkinter GUI*
*firebase-admin*"]

    ESP["**ESP32 + AS608**
*Fingerprint Sensor*
*Arduino C++*
*Templates: 162*"]

    WA <--> |HTTPS / WSS| F
    RPI <--> |HTTPS REST| F
    RPI <--> |Serial 115200 baud| ESP
    F --> |Push / Real-time| WA
    RPI --> |Pull 2s| F
```

## Architectural Layers

### 1. Presentation Layer (Web App)

The Web Application is the primary user-facing component, built with modern frontend technologies and deployed as a static site on Vercel.

| Aspect | Specification |
|--------|--------------|
| **Framework** | Next.js 14 with App Router |
| **Language** | TypeScript 5.5 |
| **Styling** | Tailwind CSS 3.4 |
| **State Management** | React Context API (AuthContext) |
| **Deployment** | Vercel (Serverless/Edge) |
| **Target Users** | Residents, Admins |

**Pages & Functionality:**

| Page | Route | Purpose |
|------|-------|---------|
| `page.tsx` | `/` | Landing page |
| `login/page.tsx` | `/login` | Authentication |
| `register/page.tsx` | `/register` | Account creation |
| `booking/page.tsx` | `/booking` | Multi-step appointment booking |
| `my-appointments/page.tsx` | `/my-appointments` | Manage appointments & OTP enrollment |
| `profile/page.tsx` | `/profile` | Resident profile management |
| `kiosk/page.tsx` | `/kiosk` | Public queue display board |
| `dolores-taytay-admin/page.tsx` | `/dolores-taytay-admin` | Admin dashboard |
| `settings/page.tsx` | `/settings` | System settings |

### 2. Cloud Services Layer (Firebase)

Firebase serves as the central data hub, providing real-time synchronization, authentication, and storage.

| Service | Purpose |
|---------|---------|
| **Firebase Authentication** | Email/password authentication for residents and admins |
| **Firebase Realtime Database (RTDB)** | Real-time data storage and sync across all clients |
| **Firebase Admin SDK** | Server-side access from RPi kiosk application |

```mermaid
graph LR
    subgraph Firebase["Firebase Platform"]
        AUTH["**Authentication**
*Email/Password*
*JWT Tokens*"]
        RTDB["**Realtime Database**
*JSON NoSQL*
*WebSocket Sync*"]
        ADMIN["**Admin SDK**
*Service Account*
*Elevated Access*"]
    end

    WA["Web App"] -->|Auth| AUTH
    RPI["RPi4 Kiosk"] -->|Admin SDK| ADMIN
    ADMIN -->|Read/Write| RTDB
    AUTH -->|User Data| RTDB
    RTDB -->|onValue Listeners| WA
    RTDB -->|HTTP Polling| RPI
```

### 3. Kiosk Application Layer (Raspberry Pi 4)

The RPi4 runs a Python application with a custom Tkinter GUI, acting as the bridge between the cloud and embedded hardware.

| Aspect | Specification |
|--------|--------------|
| **Runtime** | Python 3.12+ |
| **GUI Framework** | customtkinter (modern themed tkinter) |
| **Database Access** | firebase-admin (Admin SDK) |
| **Serial Communication** | pyserial (115200 baud) |
| **Deployment** | systemd service (auto-start on boot) |

```mermaid
graph TD
    subgraph Kiosk["Raspberry Pi 4 Kiosk"]
        APP["**KioskApp**
*Orchestrator*"]
        HOME["**Home Screen**
*Queue Display*"]
        VERIFY["**Verify Screen**
*Fingerprint Scan*"]
        ENROLL["**Enroll Screen**
*Enrollment*"]
        ADMIN["**Admin Screen**
*PIN Protected*"]
        RES["**Result Screen**
*Success/Failure*"]
        SER["**Serial Handler**
*Auto-reconnect*"]
        CMD["**Command Processor**
*RTDB -> ESP32*"]
    end

    APP --> HOME
    APP --> VERIFY
    APP --> ENROLL
    APP --> ADMIN
    APP --> RES
    APP --> SER
    APP --> CMD
    SER --> ESP["ESP32 + AS608"]
    CMD --> |kiosk_commands| FB["Firebase RTDB"]
```

### 4. Embedded Hardware Layer (ESP32 + AS608)

The ESP32 microcontroller handles fingerprint sensor operations, managed by the RPi4 via serial communication.

```mermaid
graph LR
    RPI["**RPi4 Kiosk**
*pyserial*"]
    ESP["**ESP32 Dev Module**
*Arduino C++*"]
    AS608["**AS608 Sensor**
*Optical Fingerprint*
*162 Templates*"]

    RPI -->|Serial 115200 baud| ESP
    ESP -->|UART 57600 baud| AS608

    style RPI fill:#c2e0c6,stroke:#333,stroke-width:2px

    style AS608 fill:#f9d5e5,stroke:#333,stroke-width:2px
```

| Component | Role |
|-----------|------|
| **ESP32 Dev Module** | Microcontroller for sensor control and UART communication |
| **AS608 Fingerprint Sensor** | Optical fingerprint scanning and template storage (up to 162 templates) |
| **Communication** | Serial over micro USB (115200 baud) |

## Data Flow Architecture

```mermaid
graph TD
    WA["**Web App**
*Next.js*"] -->|HTTPS/REST| FB["**Firebase RTDB**"]
    RPI["**RPi4 Kiosk**
*Python*"] -->|HTTPS REST| FB
    FB -->|WebSocket Listeners| WA
    FB -->|HTTP Polling 2s| RPI
    RPI -->|Serial 115200 baud| ESP["**ESP32 + AS608**"]
    ESP -->|Fingerprint Results| RPI

    subgraph DataNodes["RTDB Data Nodes"]
        U["users/{uid}"]
        S["services/{id}"]
        A["appointments/{id}"]
        KC["kiosk_commands/{id}"]
        KS["kiosk_status/{id}"]
    end

    FB --> U & S & A & KC & KS
```

## Communication Protocols

```mermaid
graph LR
    subgraph Protocols["Communication Flow"]
        direction LR
        A["**Web App**
*Firebase JS SDK*"]
        B["**Firebase RTDB**
*Google Cloud*"]
        C["**RPi4 Kiosk**
*firebase-admin*"]
        D["**ESP32**
*Arduino SDK*"]
        E["**AS608**
*Adafruit Lib*"]
    end

    A <-->|HTTPS / WSS
    *JSON*| B
    C <-->|HTTPS REST
    *JSON*| B
    C <-->|Serial 115200
    *Plain Text*| D
    D <-->|UART 57600
    *Binary*| E
```

### Web App to Firebase RTDB
- **Protocol:** HTTPS/REST + WebSocket (Firebase SDK)
- **Authentication:** Firebase Auth JWT tokens
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

```mermaid
graph TD
    subgraph Vercel["Vercel Edge Network"]
        WA["**Next.js Web App**
*Static Export*
*Vercel CDN*"]
    end

    subgraph Google["Google Cloud / Firebase"]
        AUTH["**Firebase Auth**
*Email/Password*"]
        RTDB["**Realtime Database**
*JSON NoSQL*"]
    end

    subgraph Local["Local Installation (Barangay Hall)"]
        RPI["**Raspberry Pi 4**
*Linux + Python*
*Touchscreen*"]
        ESP["**ESP32 + AS608**
*Fingerprint Ops*"]
    end

    WA -->|HTTPS| AUTH
    WA -->|WSS| RTDB
    RPI -->|HTTPS| RTDB
    RPI -->|Serial| ESP

    style Vercel fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style Google fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style Local fill:#fff3e0,stroke:#e65100,stroke-width:2px
```

## Security Architecture

```mermaid
graph TD
    subgraph Security["Security Measures by Layer"]
        A["**Web App**
*Firebase Auth JWT*
*HTTPS*
*Role-based Access*"]
        B["**Firebase RTDB**
*Security Rules*
*JSON Access Control*
*Admin SDK*"]
        C["**RPi4 Kiosk**
*Service Account JSON*
*Environment Variables*
*systemd Isolation*"]
        D["**Serial/UART**
*Physical-only Access*
*No Network Exposure*"]
        E["**AS608 Sensor**
*Templates on Flash*
*Never Transmitted as Raw Images*"]
    end

    A --> B --> C --> D --> E
```

| Layer | Security Measures |
|-------|-------------------|
| **Web App** | Firebase Auth (JWT), HTTPS, Role-based access (resident/admin) |
| **Firebase RTDB** | Security rules (JSON-based access control), Admin SDK for server ops |
| **RPi4** | Service account JSON (not committed), systemd isolation, environment variables |
| **Serial/UART** | Physical-only access (micro USB), no network exposure |
| **Fingerprint Data** | Templates stored on AS608 flash (never transmitted as raw images) |

## Scalability Considerations

```mermaid
graph LR
    subgraph Scale["Scalability Per Component"]
        direction TB
        WEB["**Web App**
*Vercel Serverless*
*Unlimited Scale*"]
        FB["**Firebase RTDB**
*Google Hosted*
*Auto Scales*"]
        RPI["**Kiosk**
*Single per Site*
*Multi-Site OK*"]
        ESP["**AS608**
*162 Templates*
*Per Kiosk*"]
    end
```

| Component | Scalability |
|-----------|------------|
| **Web App** | Vercel serverless automatically scales |
| **Firebase RTDB** | NoSQL real-time database scales with Firebase infrastructure |
| **RPi4** | Single kiosk per deployment; multiple kiosks can connect to the same RTDB |
| **ESP32** | Local processing; sensor capacity ~162 fingerprint templates |

## Monitoring & Logging

```mermaid
graph LR
    A["**Monitoring & Logging**"] --> B["**Web App**
*Vercel Analytics*
*Browser Console*"]
    A --> C["**Firebase**
*Console Dashboard*
*Auth Logs*
*RTDB Viewer*"]
    A --> D["**RPi4**
*systemd Journal*
*journalctl -f*"]
    A --> E["**ESP32**
*Serial Monitor*
*Arduino IDE*"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

| Component | Monitoring |
|-----------|-----------|
| Web App | Vercel analytics, Browser console logs |
| Firebase | Firebase console (real-time database viewer, auth logs) |
| RPi4 | systemd journal (`journalctl -u kiosk-firebase -f`), application logs |
| ESP32 | Serial monitor (Arduino IDE) for debugging |
