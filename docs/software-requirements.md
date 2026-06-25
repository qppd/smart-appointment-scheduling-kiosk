# Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose

This document specifies the software requirements for the Smart Appointment Scheduling Kiosk system, a digital solution for Barangay-level government service management and biometric check-in.

### 1.2 Scope

The system shall provide online appointment booking, real-time queue management, and biometric fingerprint-based check-in at physical kiosks.

### 1.3 Definitions

| Term | Definition |
|------|-----------|
| **Barangay** | The smallest administrative division in the Philippines (village/ward) |
| **Resident** | A registered user who books appointments |
| **Admin** | A system administrator who manages services and monitors queues |
| **Kiosk** | The physical Raspberry Pi + ESP32 + fingerprint sensor station |
| **Template** | A stored digital fingerprint representation on the AS608 sensor |
| **OTP** | One-Time Password for self-service fingerprint enrollment |

---

## 2. Functional Requirements

### 2.1 Authentication & Authorization (F-001 to F-010)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-001 | The system shall allow residents to register with email and password | Must |
| F-002 | The system shall authenticate users via Firebase Authentication | Must |
| F-003 | The system shall distinguish between resident and admin roles | Must |
| F-004 | The system shall support OTP verification via SMS for account activation | Should |
| F-005 | The system shall allow users to reset their password | Should |
| F-006 | The system shall persist login sessions using localStorage | Must |
| F-007 | The admin panel shall be protected by role-based access control | Must |
| F-008 | The kiosk shall authenticate to Firebase using service account credentials | Must |
| F-009 | The kiosk admin panel shall require a PIN code for access | Must |
| F-010 | The system shall log out inactive users after a configurable timeout | Should |

### 2.2 Appointment Management (F-011 to F-020)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-011 | The system shall allow residents to view available services | Must |
| F-012 | The system shall display available time slots based on service capacity | Must |
| F-013 | The system shall prevent double-booking of the same time slot | Must |
| F-014 | The system shall assign a unique queue number (per service, per day) to each booking | Must |
| F-015 | The system shall generate a unique appointment code for each booking | Must |
| F-016 | Residents shall be able to cancel their appointments | Must |
| F-017 | Residents shall be able to reschedule appointments to a different date/time | Should |
| F-018 | The system shall send appointment reminders (via SMS or email) 24 hours before | Should |
| F-019 | The system shall mark appointments as completed, cancelled, or no-show | Must |
| F-020 | The system shall maintain a waitlist when slots are full | Could |

### 2.3 Service Management (F-021 to F-025)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-021 | Admins shall be able to add new services with name, description, duration, and capacity | Must |
| F-022 | Admins shall be able to edit and deactivate existing services | Must |
| F-023 | The system shall display service categories/departments | Should |
| F-024 | The system shall support custom operating hours per service | Could |
| F-025 | The system shall support holiday/service suspension | Could |

### 2.4 Fingerprint Biometric (F-026 to F-035)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-026 | The system shall enroll fingerprints via the ESP32 + AS608 sensor | Must |
| F-027 | The system shall verify fingerprints with 1:N matching | Must |
| F-028 | The system shall store fingerprint templates on the AS608 flash (not in database) | Must |
| F-029 | The system shall link fingerprint template IDs to user accounts in RTDB | Must |
| F-030 | The system shall support up to 162 fingerprint templates (AS608 capacity) | Must |
| F-031 | Enrollment shall require multiple scans for quality assurance | Should |
| F-032 | The kiosk shall display real-time enrollment feedback (place finger, remove, etc.) | Must |
| F-033 | Admins shall be able to delete fingerprint templates (e.g., for removed residents) | Must |
| F-034 | The system shall support OTP-based self-enrollment at the kiosk | Should |
| F-035 | The kiosk shall show a "place finger" animation during verification | Should |

### 2.5 Queue Management (F-036 to F-042)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-036 | The system shall display a public queue board showing current numbers | Must |
| F-037 | The queue shall update in real-time for all connected clients | Must |
| F-038 | The system shall call the next number in the queue | Should |
| F-039 | The system shall display estimated wait times | Could |
| F-040 | Admins shall be able to manually advance or reset the queue | Should |
| F-041 | The system shall play an audio cue when calling the next number | Could |
| F-042 | The public display shall be accessible without login | Must |

### 2.6 Kiosk Operations (F-043 to F-049)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-043 | The kiosk shall boot automatically and start the application | Must |
| F-044 | The kiosk shall auto-reconnect to the serial port if ESP32 disconnects | Must |
| F-045 | The kiosk shall display the current date and time | Must |
| F-046 | The kiosk shall show network connectivity status | Should |
| F-047 | The kiosk shall report its online status to RTDB every 30 seconds | Must |
| F-048 | The kiosk shall display an error if fingerprint sensor fails | Must |
| F-049 | The kiosk shall handle touchscreen input without physical keyboard | Must |

### 2.7 Reporting & Analytics (F-050 to F-055)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-050 | Admins shall view daily/weekly/monthly appointment statistics | Should |
| F-051 | The system shall track service utilization rates | Should |
| F-052 | The system shall generate reports on no-shows and cancellations | Should |
| F-053 | The system shall log all kiosk check-in activities | Should |
| F-054 | The system shall export appointment data to CSV/Excel | Could |
| F-055 | The system shall display a dashboard with key metrics | Should |

---

## 3. Non-Functional Requirements

### 3.1 Performance Requirements (NFR-001 to NFR-005)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Web app page load time | < 3 seconds |
| NFR-002 | Time-to-interactive (TTI) | < 5 seconds |
| NFR-003 | Firebase RTDB sync latency | < 200ms |
| NFR-004 | Fingerprint scan and match | < 3 seconds total |
| NFR-005 | Kiosk command poll interval | Every 2 seconds |

### 3.2 Security Requirements (NFR-006 to NFR-012)

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-006 | All web traffic shall use HTTPS | Must |
| NFR-007 | Firebase credentials shall not be committed to version control | Must |
| NFR-008 | All form inputs shall be validated (client and server) | Must |
| NFR-009 | Rate limiting shall be applied to authentication endpoints | Should |
| NFR-010 | Fingerprint sensor credentials shall be stored in environment variables | Must |
| NFR-011 | RTDB security rules shall enforce data access by user role | Must |
| NFR-012 | Admin actions shall be logged with timestamps | Should |

### 3.3 Reliability Requirements (NFR-013 to NFR-017)

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-013 | The kiosk shall auto-restart on crash (systemd `Restart=always`) | Must |
| NFR-014 | Serial communication shall recover from connection loss | Must |
| NFR-015 | The web app shall degrade gracefully when offline | Should |
| NFR-016 | Firebase connection failures shall be retried with exponential backoff | Should |
| NFR-017 | The system shall handle ESP32 watchdog resets gracefully | Should |

### 3.4 Usability Requirements (NFR-018 to NFR-023)

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-018 | The web app shall be responsive (mobile-first design) | Must |
| NFR-019 | The kiosk UI shall have large, touch-friendly buttons | Must |
| NFR-020 | The kiosk shall support Filipino and English languages | Could |
| NFR-021 | Error messages shall be user-friendly and actionable | Must |
| NFR-022 | The public queue display shall be readable from a distance (large fonts) | Must |
| NFR-023 | The system shall provide visual feedback for all kiosk actions | Must |

### 3.5 Scalability Requirements (NFR-024 to NFR-027)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-024 | Concurrent web users | Unlimited (Firebase hosted) |
| NFR-025 | Fingerprint templates per kiosk | 162 (AS608 limit) |
| NFR-026 | Appointments per day | 1000+ (Firebase scalable) |
| NFR-027 | Multiple kiosks per database | Supported (unique kiosk IDs) |

### 3.6 Compatibility Requirements (NFR-028 to NFR-031)

| ID | Requirement | Details |
|----|-------------|---------|
| NFR-028 | Browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| NFR-029 | Screen sizes | Mobile (320px+) to Desktop (1920px+) |
| NFR-030 | RPi4 OS | Raspberry Pi OS Lite (64-bit) |
| NFR-031 | ESP32 toolchain | Arduino IDE 2.x with ESP32 core |

---

## 4. System Interfaces

### 4.1 User Interfaces

| Interface | Description |
|-----------|-------------|
| **Web Interface** | Next.js application accessible via browser at any screen size |
| **Kiosk Touchscreen** | Fullscreen customtkinter GUI on 7-inch touchscreen |
| **Admin Dashboard** | Web-based with charts, tables, and action buttons |
| **Public Queue Display** | Read-only web page with large, high-contrast text |

### 4.2 Hardware Interfaces

| Interface | Description |
|-----------|-------------|
| **RPi4 -> ESP32** | USB Serial (USB-to-UART bridge on ESP32) |
| **ESP32 -> AS608** | Hardware Serial (GPIO16/17, 57600 baud) |
| **RPi4 -> Touchscreen** | HDMI + USB (touch) or DSI |
Likensor | **RPi4 -> Network** | Ethernet or Wi-Fi |

### 4.3 Software Interfaces

| Interface | Protocol | Data Format |
|-----------|----------|-------------|
| Web App <-> Firebase | HTTPS/WS | JSON |
| RPi4 <-> Firebase | HTTPS REST | JSON |
| RPi4 <-> ESP32 | Serial (115200 baud) | Plain text |
| ESP32 <-> AS608 | UART (57600 baud) | Binary (Adafruit protocol) |

---

## 5. Constraints

| Category | Constraint |
|----------|-----------|
| **Budget** | Firebase Spark (free tier) for < 1000 daily active users |
| **Connectivity** | Internet required for Firebase sync; kiosk can operate offline briefly |
| **Hardware** | AS608 sensor limited to 162 templates |
| **Power** | Continuous power supply required (UPS recommended) |
| **Location** | Single deployment per Barangay (multi-site requires unique kiosk IDs) |
| **Browser** | No support for Internet Explorer |
