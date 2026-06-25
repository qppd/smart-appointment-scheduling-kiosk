# Flow Diagrams & Sequence Charts

This document contains detailed Mermaid diagrams illustrating the key processes and data flows in the Smart Appointment Scheduling Kiosk system.

---

## 1. System-Level Data Flow Diagram

```mermaid
graph TD
    R["**Resident**
*(Web Browser)*"]
    W["**Web Application**
*Next.js + Firebase SDK*"]
    DB["**Firebase RTDB**
*Real-time Database*"]
    K1["**RPi4 Kiosk #1**
*(Python GUI)*"]
    K2["**RPi4 Kiosk #2**
*(Python GUI)*"]
    KN["**RPi4 Kiosk #N**
*(Python GUI)*"]
    E1["**ESP32 + AS608**
*Fingerprint*"]
    E2["**ESP32 + AS608**
*Fingerprint*"]
    EN["**ESP32 + AS608**
*Fingerprint*"]

    R -->|HTTPS| W
    W -->|WebSocket| DB
    DB -->|HTTP PULL\nEvery 2s| K1
    DB -->|HTTP PULL\nEvery 2s| K2
    DB -->|HTTP PULL\nEvery 2s| KN
    K1 -->|Serial| E1
    K2 -->|Serial| E2
    KN -->|Serial| EN
    K1 -->|Write Results| DB
    K2 -->|Write Results| DB
    KN -->|Write Results| DB

    style DB fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style W fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style K1 fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style K2 fill:#fff3e0,stroke:#e65100
    style KN fill:#fff3e0,stroke:#e65100
    style E1 fill:#f3e5f5,stroke:#7b1fa2
    style E2 fill:#f3e5f5,stroke:#7b1fa2
    style EN fill:#f3e5f5,stroke:#7b1fa2
```

---

## 2. Appointment Booking Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    participant RES as **Resident**
    participant WA as **Web App**
    participant FB as **Firebase RTDB**

    RES ->> WA: 1. Open application
    WA ->> FB: 2. Authenticate (Email/Password)
    FB -->> WA: Auth token (JWT)
    WA -->> RES: Logged in
    RES ->> WA: 3. Browse services
    WA ->> FB: 4. GET /services
    FB -->> WA: Services list
    WA -->> RES: Display services
    RES ->> WA: 5. Select service & date
    WA ->> FB: 6. Query available slots
    FB -->> WA: Slot data
    WA -->> RES: Display available times
    RES ->> WA: 7. Select time slot
    WA ->> FB: 8. Atomic slot booking\n(appointments/slot_bookings)
    WA ->> FB: 9. Create appointment record
    FB -->> WA: Confirmation
    WA -->> RES: 10. Booking confirmed
```

---

## 3. Fingerprint Check-In Flow

```mermaid
sequenceDiagram
    participant RES as **Resident**
    participant KIOSK as **RPi4 Kiosk**
    participant ESP as **ESP32 + AS608**
    participant DB as **Firebase RTDB**
    participant WEB as **Web App**

    RES ->> KIOSK: 1. Arrive at kiosk
    KIOSK ->> ESP: 2. Send VERIFY command
    ESP ->> ESP: Scan & match (1:N)
    ESP -->> KIOSK: 3. Return template_id or -1
    KIOSK ->> DB: 4. Query user by template_id
    DB -->> KIOSK: User data
    KIOSK ->> DB: 5. Check appointment
    DB -->> KIOSK: Appointment record
    KIOSK ->> DB: 6. Update status to 'checked_in'
    DB -->> WEB: 7. Real-time update
    KIOSK -->> RES: 8. Display queue number & status
    KIOSK -->> RES: 9. Show success/failure
```

---

## 4. Fingerprint Enrollment Flow

```mermaid
sequenceDiagram
    participant RES as **Resident**
    participant ADMIN as **Web App (Admin)**
    participant DB as **Firebase RTDB**
    participant KIOSK as **RPi4 Kiosk**
    participant ESP as **ESP32 + AS608**

    RES ->> ADMIN: 1. Visit for enrollment
    ADMIN ->> DB: 2. Write ENROLL command\n(kiosk_commands/)
    KIOSK ->> DB: 3. Poll every 2s
    DB -->> KIOSK: 4. New ENROLL command
    KIOSK ->> ESP: 5. Send ENROLL:<id>
    ESP ->> ESP: Capture (3 scans)
    ESP ->> ESP: Create & store model
    ESP -->> KIOSK: 6. Enrollment result
    KIOSK ->> DB: 7. Write result to kiosk_status
    DB -->> ADMIN: 8. Admin sees result
    ADMIN -->> RES: 9. Enrollment complete
```

---

## 5. OTP-Based Self-Enrollment Flow

```mermaid
sequenceDiagram
    participant RES as **Resident**
    participant WA as **Web App**
    participant DB as **Firebase RTDB**
    participant KIOSK as **RPi4 Kiosk**
    participant ESP as **ESP32 + AS608**

    RES ->> WA: 1. Request OTP for enrollment
    WA ->> DB: 2. Generate OTP & store in user profile
    WA -->> RES: 3. Display OTP
    KIOSK ->> DB: 4. Poll for enrollment requests
    DB -->> KIOSK: Pending OTP flag
    KIOSK -->> RES: Prompt for OTP entry
    RES ->> KIOSK: 6. Enter OTP on touchscreen
    KIOSK ->> DB: 5. Verify OTP against user record
    DB -->> KIOSK: OTP valid
    KIOSK ->> ESP: 7. Trigger enrollment
    ESP ->> ESP: Capture & store fingerprint
    ESP -->> KIOSK: Enrollment success
    WA -->> RES: 8. Show enrollment complete
```

---

## 6. Real-Time Queue Update Flow

```mermaid
sequenceDiagram
    participant WB1 as **Web Browser 1**
    participant WB2 as **Web Browser 2**
    participant WB3 as **Web Browser 3**
    participant DB as **Firebase RTDB**
    participant KIOSK as **RPi4 Kiosk**

    WB1 ->> DB: Subscribe to queue updates
    WB2 ->> DB: Subscribe to queue updates
    WB3 ->> DB: Subscribe to queue updates
    KIOSK ->> KIOSK: Resident checks in
    KIOSK ->> DB: Update appointment status & queue
    DB -->> WB1: Push: Queue updated
    DB -->> WB2: Push: Queue updated
    DB -->> WB3: Push: Queue updated
    Note over WB1,WB3: All browsers see updated queue in real-time
```

---

## 7. ESP32 Fingerprint Operations Flow

```mermaid
flowchart TD
    START(["Start"]) --> WAIT["Wait for serial command"]
    WAIT --> PARSE["Parse command"]
    PARSE --> CMD{Command type?}

    CMD -->|ENROLL:<id>| ENROLL["Initialize enrollment\n(capture 3 scans)"]
    CMD -->|VERIFY| VERIFY["Start 1:N matching"]
    CMD -->|DELETE:<id>| DELETE["Delete template"]
    CMD -->|LIST| LIST["List all template IDs"]
    CMD -->|COUNT| COUNT["Get template count"]
    CMD -->|STATUS| STATUS["Get system status"]

    ENROLL --> ENROLL_OK{"Enrollment\nsuccessful?"}
    ENROLL_OK -->|Yes| ENROLL_OK_RES["Return OK + template_id"]
    ENROLL_OK -->|No| ENROLL_ERR["Return ERR: Enrollment failed"]

    VERIFY --> MATCH{"Match\nfound?"}
    MATCH -->|Yes| MATCH_OK["Return OK + template_id + confidence"]
    MATCH -->|No| MATCH_ERR["Return ERR: Not found"]

    DELETE --> DEL_OK["Delete from AS608 flash"]
    DEL_OK --> DEL_RES["Return OK: Template deleted"]

    LIST --> LIST_RES["Return list of template IDs"]
    COUNT --> COUNT_RES["Return template count"]
    STATUS --> STATUS_RES["Return ESP32 + AS608 status"]

    ENROLL_OK_RES --> WAIT
    ENROLL_ERR --> WAIT
    MATCH_OK --> WAIT
    MATCH_ERR --> WAIT
    DEL_RES --> WAIT
    LIST_RES --> WAIT
    COUNT_RES --> WAIT
    STATUS_RES --> WAIT

    style WAIT fill:#e3f2fd,stroke:#1565c0
    style CMD fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style START fill:#e8f5e9,stroke:#2e7d32
    style ENROLL fill:#f3e5f5,stroke:#7b1fa2
```

---

## 8. Kiosk Boot & Initialization Flow

```mermaid
flowchart TD
    START(["RPi4 Boots"]) --> SYSTEMD["systemd starts\nkiosk-firebase.service"]
    SYSTEMD --> MAIN["main.py launches"]
    MAIN --> INIT_FB["Initialize Firebase\nconnection"]
    INIT_FB --> FB_OK{"Firebase\nconnected?"}
    FB_OK -->|No| FB_RETRY["Log error & retry\n(5s backoff)"]
    FB_RETRY --> INIT_FB
    FB_OK -->|Yes| INIT_SER["Initialize serial port\n/dev/ttyUSB0"]
    INIT_SER --> ESP_OK{"ESP32\ndetected?"}
    ESP_OK -->|No| ESP_RETRY["Log error & retry\nreconnect logic"]
    ESP_RETRY --> INIT_SER
    ESP_OK -->|Yes| GUI["Show Home Screen"]
    GUI --> KIOSK_OK["Write online status\nto kiosk_status/ in RTDB"]
    KIOSK_OK --> POLL["Start polling loop\n(kiosk_commands,\n2s interval)"]
    POLL --> RUNNING(["RUNNING STATE"])

    FB_OK@{ shape: diamond }
    ESP_OK@{ shape: diamond }
    style START fill:#e8f5e9,stroke:#2e7d32
    style RUNNING fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style FB_RETRY fill:#ffebee,stroke:#c62828
    style ESP_RETRY fill:#ffebee,stroke:#c62828
```

---

## 9. Web App Authentication Flow

```mermaid
flowchart TD
    START(["Start"]) --> CLICK["User clicks Sign In"]
    CLICK --> CRED["Enter email & password"]
    CRED --> AUTH["Firebase auth()\nsignInWithEmailAndPassword()"]
    AUTH --> OK{"Auth\nsuccessful?"}
    OK -->|No| ERR["Display error message\n(invalid crentials)"]
    ERR --> CRED
    OK -->|Yes| STORE["Store user in AuthContext\n& localStorage"]
    STORE --> ROLE{"User role?"}
    ROLE -->|admin| ADMIN["Redirect to\n/dolores-taytay-admin"]
    ROLE -->|resident| USER["Redirect to\n/my-appointments"]
    ADMIN --> SUB["Subscribe to RTDB listeners"]
    USER --> SUB
    SUB --> READY(["READY STATE"])

    style START fill:#e8f5e9,stroke:#2e7d32
    style READY fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style OK fill:#fff3e0,stroke:#e65100,stroke-width:2px
```

---

## 10. Data Synchronization Flow

```mermaid
sequenceDiagram
    participant WA as **Web App**
    participant DB as **Firebase RTDB**
    participant KIOSK as **RPi4 Kiosk**
    participant ESP as **ESP32 + AS608**

    Note over WA,ESP: Scenario: Admin creates an ENROLL command

    WA ->> DB: Write ENROLL command
    Note over DB: kiosk_commands/{id}
    KIOSK ->> DB: Poll every 2s
    DB -->> KIOSK: ENROLL command found
    KIOSK ->> ESP: ENROLL:<template_id>
    ESP ->> ESP: Capture & store fingerprint
    ESP -->> KIOSK: OK: Enrollment complete
    KIOSK ->> DB: Update command status to 'completed'
    KIOSK ->> DB: Update kiosk_status (template_count)
    DB -->> WA: Real-time push: command completed
    Note over WA: Admin sees completion status
```
