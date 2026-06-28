# Flow Diagrams & Sequence Charts (Updated — Actual Codebase)

This document contains detailed Mermaid diagrams illustrating the key processes and data flows in the Smart Appointment Scheduling Kiosk system. All commands and flows reflect the **actual built system** at `git HEAD`.

---

## 1. System-Level Data Flow Diagram

```mermaid
graph TD
    R["**Resident** *(Web Browser)*"]
    A["**Admin** *(Web Browser)*"]
    W["**Web Application** *(Next.js + Firebase SDK)*"]
    V["**Vercel Serverless** *(/api/sms/*)"]
    DB["**Firebase RTDB** *(Real-time Database)*"]
    SEM["**Semaphore.co** *(SMS Gateway)*"]
    K1["**RPi4 Kiosk #1** *(Python GUI)*"]
    K2["**RPi4 Kiosk #N** *(Python GUI)*"]
    E1["**ESP32 + AS608** *(Fingerprint)*"]
    E2["**ESP32 + AS608** *(Fingerprint)*"]

    R -->|HTTPS| W
    A -->|HTTPS| W
    W -->|WebSocket| DB
    W -->|HTTPS| V
    V -->|HTTPS| SEM
    DB -->|HTTP PULL 5s| K1
    DB -->|HTTP PULL 5s| K2
    K1 -->|Serial 115200| E1
    K2 -->|Serial 115200| E2
    K1 -->|Write Results| DB
    K2 -->|Write Results| DB

    style DB fill:#e8f5e9,stroke:#2e7d32
    style W fill:#e3f2fd,stroke:#1565c0
    style V fill:#e3f2fd,stroke:#1565c0
    style SEM fill:#fff3e0,stroke:#e65100
    style K1 fill:#fff3e0,stroke:#e65100
    style K2 fill:#fff3e0,stroke:#e65100
```

---

## 2. Appointment Booking Flow (with Atomic Slot Lock + OTP)

```mermaid
sequenceDiagram
    participant RES as **Resident**
    participant WA as **Web App (Next.js)**
    participant FB as **Firebase RTDB**
    participant SEM as **Semaphore.co**

    RES ->> WA: 1. Browse services
    WA ->> FB: 2. GET /services (onValue listener)
    FB -->> WA: Services list
    WA -->> RES: Select service & date

    RES ->> WA: 3. Select time slot
    WA ->> FB: 4. runTransaction(slot_bookings/{key})
    Note over WA,FB: Atomic slot claim with claim token
    FB -->> WA: Slot locked

    WA ->> FB: 5. Verify daily capacity
    WA ->> FB: 6. Create appointment (with enrollment_otp)
    FB -->> WA: Appointment created
    WA -->> RES: 7. Show confirmation + enrollment OTP

    RES ->> WA: 8. (Optional) Regenerate OTP if lost
    WA ->> FB: Update enrollment_otp + expires_at
    FB -->> WA: New OTP

    WA ->> SEM: 9. Booking confirmation SMS (fire-and-forget)
```

### Booking Data Flow Detail

```
createAppointment(data, dailyCapacity):
  1. slotKey = sanitizeKey(serviceId + date + start + end)
  2. claimToken = unique random string
  3. runTransaction(slotRef):
       if slot occupied → return current (no change)
       else → return claimToken
  4. Verify claim: get(slotRef) === claimToken
  5. Count today's active appointments for this service
  6. if >= dailyCapacity → release slot, throw Error
  7. Generate enrollment OTP (6-digit, 24h expiry)
  8. push() + set() → new appointment record
  9. set(slotRef, newRef.key)
  10. Return { id, otp }
```

---

## 3. Fingerprint Check-In Flow (Actual)

```mermaid
sequenceDiagram
    participant RES as **Resident**
    participant KIOSK as **RPi4 Kiosk**
    participant ESP as **ESP32 + AS608**
    participant DB as **Firebase RTDB**
    participant WEB as **Web App**

    RES ->> KIOSK: 1. Tap "Check In" (or touch fingerprint sensor)
    KIOSK ->> ESP: 2. Send FP_VERIFY
    ESP ->> ESP: 3. Scan & 1:N match (fpSensor.authenticate())
    ESP -->> KIOSK: 4. FP_MATCH:<template_id> or FP_NO_MATCH

    alt Match Found
        KIOSK ->> KIOSK: 5. Lookup template_id in _template_index cache
        alt Cache Hit
            KIOSK ->> KIOSK: uid found in memory
        else Cache Miss
            KIOSK ->> DB: 5a. GET /users (full scan fallback)
            DB -->> KIOSK: All users
            KIOSK ->> KIOSK: 5b. Rebuild _template_index + _user_cache
        end

        KIOSK ->> DB: 6. GET /appointments (today, resident_id, status=scheduled)
        DB -->> KIOSK: Today's appointment

        KIOSK ->> DB: 7. UPDATE appointment status → 'checked_in'
        DB -->> WEB: 8. Real-time push via onValue listener
        KIOSK -->> RES: 9. Show success screen (queue #, service name, time)
    else No Match
        KIOSK -->> RES: 10. Show failure screen + retry option
    end
```

---

## 4. Fingerprint Enrollment Flow (Admin-triggered)

```mermaid
sequenceDiagram
    participant ADMIN as **Web App (Admin)**
    participant DB as **Firebase RTDB**
    participant KIOSK as **RPi4 Kiosk**
    participant ESP as **ESP32 + AS608**

    ADMIN ->> DB: 1. Write kiosk_commands/{id}: { type: "enroll", slot: N }
    KIOSK ->> DB: 2. Poll every 5s (commands_loop)
    DB -->> KIOSK: 3. Pending enroll command
    KIOSK ->> KIOSK: 4. CommandProcessor.process()
    KIOSK ->> ESP: 5. FP_ENROLL:<slot>
    ESP ->> ESP: 6. Capture scan 1 (Place finger)
    ESP ->> ESP: 7. Capture scan 2 (Remove finger)
    ESP ->> ESP: 8. Capture scan 3 (Place again)
    ESP ->> ESP: 9. Create model + store
    ESP -->> KIOSK: 10. FP_ENROLLED:<id>
    KIOSK ->> DB: 11. Update kiosk_commands/{id}: status='completed', result={template_id, success}
    KIOSK ->> DB: 12. Update users/{uid}: fingerprint_enrolled=true, fingerprint_template_id=N
    DB -->> ADMIN: 13. Real-time push: command completed
```

---

## 5. OTP-Based Self-Enrollment Flow

```mermaid
sequenceDiagram
    participant RES as **Resident**
    participant WA as **Web App**
    participant DB as **Firebase RTDB**
    participant KIOSK as **RPi4 Kiosk (OTPEnrollScreen)**
    participant ESP as **ESP32 + AS608**

    RES ->> WA: 1. Book appointment
    WA ->> DB: 2. Create appointment with enrollment_otp (6-digit, 24h expiry)
    WA -->> RES: 3. Display OTP on confirmation screen
    Note over RES: Resident arrives at kiosk

    RES ->> KIOSK: 4. Tap "Enroll your fingerprint"
    KIOSK -->> RES: 5. Enter 6-digit OTP on numpad
    RES ->> KIOSK: 6. Type digits + press Verify

    KIOSK ->> DB: 7. Scan all appointments for matching enrollment_otp
    Note over KIOSK,DB: Checks: OTP match, status='scheduled', date=today/future, not expired, not consumed
    DB -->> KIOSK: 8. Matched appointment found
    KIOSK ->> DB: 9. Check users/{uid}:fingerprint_enrolled
    DB -->> KIOSK: Not enrolled yet

    KIOSK -->> RES: 10. Show appointment summary + Proceed to Enroll
    RES ->> KIOSK: 11. Confirm enrollment

    KIOSK ->> ESP: 12. FP_ENROLL:<slot> (auto-selected free slot)
    ESP ->> ESP: 13. 3-scan capture + model creation
    ESP -->> KIOSK: 14. FP_ENROLLED:<id>
    KIOSK ->> DB: 15. Update users/{uid}: fingerprint_template_id, fingerprint_enrolled
    KIOSK ->> DB: 16. Update appointments/{id}: enrollment_otp_consumed_at
    KIOSK ->> KIOSK: 17. Invalidate _user_cache + _template_index
    KIOSK -->> RES: 18. Enrollment complete → redirect to Verify
```

---

## 6. Real-Time Queue Update Flow

```mermaid
sequenceDiagram
    participant WB1 as **Web Browser 1**
    participant WB2 as **Web Browser 2**
    participant DB as **Firebase RTDB**
    participant KIOSK as **RPi4 Kiosk**

    WB1 ->> DB: Subscribe to appointments (onValue)
    WB2 ->> DB: Subscribe to appointments (onValue)
    KIOSK ->> KIOSK: Resident checks in via fingerprint
    KIOSK ->> DB: Update appointment status → 'checked_in'
    DB -->> WB1: Push: appointment updated
    DB -->> WB2: Push: appointment updated
    Note over WB1,WB2: All browsers see updated queue in real-time
```

---

## 7. ESP32 Fingerprint Operations Flow (Actual Commands)

```mermaid
flowchart TD
    START(["ESP32 Boot"]) --> INIT["Serial.begin(115200)
fingerSerial.begin(57600, GPIO16/17)
fpSensor.begin()"]
    INIT --> SENSOR_OK{"Sensor
verified?"}
    SENSOR_OK -->|Yes| READY["Print: OK:Fingerprint sensor initialized
OK:ESP32 ready"]
    SENSOR_OK -->|No| ERR["Print: ERR:Fingerprint sensor not found"]
    ERR --> WAIT

    READY --> WAIT["Wait for serial command
(loop)"]
    WAIT --> PARSE["Parse command buffer
(newline-delimited)"]
    PARSE --> CMD{"Command type?"}

    CMD -->|PING| PONG["Print PONG"]
    CMD -->|FP_ENROLL:<id>| ENROLL["handleEnroll(id)
3-scan capture (30s timeout)"]
    CMD -->|FP_AUTOENROLL| AUTO["handleAutoEnroll()
Find empty slot + enroll"]
    CMD -->|FP_VERIFY| VERIFY["handleVerify()
fpSensor.authenticate()"]
    CMD -->|FP_SEARCH| SEARCH["handleSearch()
fpSensor.search()"]
    CMD -->|FP_DELETE:<id>| DELETE["fpSensor.deleteFingerprint(id)"]
    CMD -->|FP_COUNT| COUNT["Print OK:<count>"]
    CMD -->|FP_ID| LASTID["Print last matched ID"]
    CMD -->|FP_LIST| LIST["handleList()
Scan 1..127 via loadModel()"]
    CMD -->|FP_CLEAR| CLEAR["fpSensor.emptyDatabase()"]
    CMD -->|FP_MONITOR| MONITOR["Toggle monitoringMode"]

    ENROLL --> ENROLL_OK{"Enrolled?"}
    ENROLL_OK -->|Yes| ENROLLED["Print FP_ENROLLED:<id>"]
    ENROLL_OK -->|No| ENROLL_ERR["Print ERR:Enrollment failed"]
    VERIFY --> MATCH{"Match?"}
    MATCH -->|>=0| MATCH_OK["Print FP_MATCH:<id>"]
    MATCH -->|-2| NO_MATCH["Print FP_NO_MATCH"]
    MATCH -->|else| VERIFY_ERR["Print ERR:Verify failed"]
    LIST --> LIST_RES["Print OK:<count> + ID:<n> lines"]
    MONITOR --> MONITOR_ON{"Monitor ON?"}
    MONITOR_ON -->|Yes| MONITOR_LOOP["Check finger every 500ms"]
    MONITOR_LOOP --> FOUND{"Finger?"}
    FOUND -->|Match| MONITOR_MATCH["Print FP_MATCH:<id>"]
    FOUND -->|No match| MONITOR_NOMATCH["Print FP_NO_MATCH"]
    FOUND -->|No finger| MONITOR_LOOP

    PONG --> WAIT
    ENROLLED --> WAIT
    ENROLL_ERR --> WAIT
    AUTO --> WAIT
    MATCH_OK --> WAIT
    NO_MATCH --> WAIT
    VERIFY_ERR --> WAIT
    SEARCH --> WAIT
    DELETE --> WAIT
    COUNT --> WAIT
    LASTID --> WAIT
    LIST_RES --> WAIT
    CLEAR --> WAIT
    MONITOR_ON -->|Off| WAIT
```

---

## 8. Kiosk Boot & Initialization Flow

```mermaid
flowchart TD
    START(["RPi4 Boots"]) --> SYSTEMD["systemd starts
kiosk-firebase.service"]
    SYSTEMD --> MAIN["main.py launches"]
    MAIN --> INIT_FB["Initialize Firebase
Admin SDK (service account)"]
    INIT_FB --> FB_OK{"Firebase
connected?"}
    FB_OK -->|No| FB_RETRY["Retry (no backoff)"]
    FB_RETRY --> INIT_FB
    FB_OK -->|Yes| INIT_SER["Initialize serial port
(default /dev/ttyUSB0)"]
    INIT_SER --> SER_OK{"Connected?"}
    SER_OK -->|No| AUTO_DETECT["Auto-detect port
(find_esp32_port())"]
    AUTO_DETECT --> DETECTED{"Found?"}
    DETECTED -->|Yes| RETRY_CONN["Reconnect with detected port"]
    RETRY_CONN --> SER_OK
    DETECTED -->|No| SER_WARN["Serial unavailable
(continue without ESP32)"]

    SER_OK -->|Yes| PING["PING ESP32"]
    PING --> ESP_OK{"PONG?"}
    ESP_OK -->|No| ESP_RETRY["Retry connect (3s poll)"]
    ESP_RETRY --> INIT_SER
    ESP_OK -->|Yes| GUI["Show Home Screen"]

    GUI --> START_THREADS["Start 3 background threads"]
    START_THREADS --> HEARTBEAT["Thread 1: Heartbeat (30s)"]
    START_THREADS --> COMMANDS["Thread 2: Commands Poll (5s)"]
    START_THREADS --> APPOINTMENTS["Thread 3: Appointments + Users Cache (30s/60s)"]

    HEARTBEAT --> RUNNING(["RUNNING STATE"])
    COMMANDS --> RUNNING
    APPOINTMENTS --> RUNNING

    style START fill:#e8f5e9,stroke:#2e7d32
    style RUNNING fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style FB_RETRY fill:#ffebee,stroke:#c62828
    style SER_WARN fill:#fff3e0,stroke:#e65100
```

---

## 9. Web App Authentication & Registration Flow

```mermaid
flowchart TD
    START(["Start"]) --> CHOOSE{"Has account?"}
    CHOOSE -->|No| REG["Register"]
    CHOOSE -->|Yes| LOGIN["Sign In"]

    REG --> REG_FORM["Fill registration form
(first_name, last_name, email, phone, password, etc.)"]
    REG_FORM --> SEND_OTP["Send OTP to phone
POST /api/sms/send-otp"]
    SEND_OTP --> OTP_STEP["Enter 6-digit OTP"]
    OTP_STEP --> VERIFY_OTP["Verify OTP
POST /api/sms/verify-otp"]
    VERIFY_OTP --> OTP_OK{"Valid?"}
    OTP_OK -->|No| OTP_ERR["Show error + retry"]
    OTP_ERR --> OTP_STEP
    OTP_OK -->|Yes| CREATE_ACCT["createUserWithEmailAndPassword()
+ set users/{uid} in RTDB"]
    CREATE_ACCT --> REDIRECT_USER["Redirect to /booking"]

    LOGIN --> CRED["Enter email & password"]
    CRED --> AUTH["signInWithEmailAndPassword()"]
    AUTH --> AUTH_OK{"Success?"}
    AUTH_OK -->|No| AUTH_ERR["Show 'Invalid credentials'"]
    AUTH_ERR --> CRED
    AUTH_OK -->|Yes| CHECK_ROLE["Read users/{uid}.role"]
    CHECK_ROLE --> ROLE{"Role?"}
    ROLE -->|admin| REDIRECT_ADMIN["Redirect to
/dolores-taytay-admin"]
    ROLE -->|resident| REDIRECT_USER
    REDIRECT_ADMIN --> SUB["Subscribe to RTDB listeners
(onValue)"]
    REDIRECT_USER --> SUB
    SUB --> READY(["READY STATE"])

    style START fill:#e8f5e9,stroke:#2e7d32
    style READY fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

---

## 10. Stateless HMAC OTP Flow

```mermaid
sequenceDiagram
    participant CLIENT as **Client (Browser/Kiosk)**
    participant API as **Vercel Serverless (/api/sms/)**
    participant CRYPTO as **Node.js crypto (HMAC-SHA256)**
    participant SEM as **Semaphore.co**

    Note over CLIENT,SEM: Send OTP
    CLIENT ->> API: POST /api/sms/send-otp { phone }
    API ->> API: normalizePhilippinePhone()
    API ->> CRYPTO: generateOtp() → 6-digit code
    API ->> CRYPTO: createOtpSession(phone, otp)
    Note over API,CRYPTO: payload = { phone, otp, expiresAt, attempts:0 }
    Note over API,CRYPTO: encoded = base64url(payload)
    Note over API,CRYPTO: sig = HMAC-SHA256(encoded, SEMAPHORE_API_KEY)
    Note over API,CRYPTO: sessionId = encoded.sig
    API ->> SEM: sendOtp(phone, "Your code is: {otp}")
    API -->> CLIENT: { sessionId, success: true }

    Note over CLIENT,SEM: Verify OTP (no DB read)
    CLIENT ->> API: POST /api/sms/verify-otp { sessionId, otp }
    API ->> CRYPTO: verifyOtp(sessionId, otp)
    Note over API,CRYPTO: Split token → encoded + sig
    Note over API,CRYPTO: Verify HMAC(encoded) === sig
    Note over API,CRYPTO: Decode payload, check expiry (5min)
    Note over API,CRYPTO: Check attempts (max 3)
    Note over API,CRYPTO: Compare otp field
    API -->> CLIENT: { success: true/false, message }
```

---

## 11. SMS Reminder Flow (Cron Script)

```mermaid
sequenceDiagram
    participant CRON as **reminder_cron.py**
    participant FB as **Firebase RTDB (Admin SDK)**
    participant SEM as **Semaphore.co**

    Note over CRON: Runs every 5-10 minutes via systemd timer

    CRON ->> FB: GET /appointments
    FB -->> CRON: All appointments
    CRON ->> CRON: Filter: status='scheduled', date=today
    CRON ->> CRON: Parse start_time → compare with now+25min..now+35min
    CRON ->> CRON: Check sms_reminder_sent != true

    alt Appointment within reminder window
        CRON ->> FB: GET /users/{resident_id}
        FB -->> CRON: User data (phone)
        CRON ->> SEM: POST /messages { apikey, number, message, sendername }
        SEM -->> CRON: { status: "Sent", message_id: "..." }
        CRON ->> FB: UPDATE appointment: sms_reminder_sent=true, sms_reminder_sent_at=now
    else Not in window or already reminded
        CRON ->> CRON: Skip
    end
```

---

## 12. Error Recovery: Serial Reconnection Flow

```mermaid
flowchart TD
    CHECK["_check_serial_status()
runs every 3s via after()"] --> CONNECTED{"ser.is_open?"}
    CONNECTED -->|Yes| UPDATE_OK["Update status bar
green 'ESP32: Connected'"]
    CONNECTED -->|No| UPDATE_FAIL["Update status bar
red 'ESP32: Disconnected'"]
    UPDATE_FAIL --> RETRY["serial.connect()
auto-reconnect"]
    RETRY --> RETRY_OK{"Connected?"}
    RETRY_OK -->|No| DETECT["find_esp32_port()
scan USB/CP210/CH340/ACM"]
    DETECT --> FOUND{"Port found?"}
    FOUND -->|Yes| RETRY2["Retry with detected port"]
    RETRY2 --> RETRY_OK
    FOUND -->|No| WAIT_RETRY["Wait 3s + retry"]
    WAIT_RETRY --> CHECK

    UPDATE_OK --> DONE
```
