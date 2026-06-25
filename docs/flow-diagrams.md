# Flow Diagrams & Sequence Charts

This document contains detailed flowcharts and sequence diagrams illustrating the key processes and data flows in the Smart Appointment Scheduling Kiosk system.

---

## 1. System-Level Data Flow Diagram

```
                    +-------------------+
                    |    RESIDENT       |
                    |   (Web Browser)   |
                    +---------+---------+
                              |
                              | HTTPS
                              v
                    +---------+---------+
                    |   WEB APPLICATION |
                    |   (Next.js +      |
                    |    Firebase SDK)  |
                    +---------+---------+
                              |
                              | WebSocket/REST
                              v
+------------+       +---------+---------+       +------------+
|            |       |  FIREBASE RTDB     |       |            |
|   RPi4     |<------|  - users           |------>|   RPi4     |
|   Kiosk    | PULL  |  - services        | PUSH  |   Kiosk    |
|   (GUI)    |       |  - appointments    |       |   (GUI)    |
+-----+------+       |  - kiosk_commands  |       +-----+------+
      |               |  - kiosk_status   |             |
      |               +---------+---------+             |
      | Serial                     | Serial            |
      v                            v                  v
+-----+------+               +-----+------+      +-----+------+
|  ESP32     |               |  ESP32     |      |  ESP32     |
| +AS608     |               | +AS608     |      | +AS608     |
| Sensor     |               | Sensor     |      | Sensor     |
+------------+               +------------+      +------------+

     Kiosk 1                      Kiosk 2            Kiosk N
```

---

## 2. Appointment Booking Flow (Sequence Diagram)

```
Resident        Web App        Firebase RTDB        RPi4 Kiosk       ESP32
   |               |                  |                  |               |
   | 1. Open app   |                  |                  |               |
   |-------------->|                  |                  |               |
   |               | 2. Login/Register|                  |               |
   |               |----------------->|                  |               |
   |               |<-----------------|                  |               |
   |               |   Auth token     |                  |               |
   |               |                  |                  |               |
   | 3. Browse     |                  |                  |               |
   |    services   |                  |                  |               |
   |-------------->|                  |                  |               |
   |               | 4. GET services  |                  |               |
   |               |----------------->|                  |               |
   |               |<-----------------|                  |               |
   |               |   services list  |                  |               |
   |               |                  |                  |               |
   | 5. Select     |                  |                  |               |
   |    service &  |                  |                  |               |
   |    date       |                  |                  |               |
   |-------------->|                  |                  |               |
   |               | 6. GET available |                  |               |
   |               |    slots         |                  |               |
   |               |----------------->|                  |               |
   |               |<-----------------|                  |               |
   |               |   slots data     |                  |               |
   |               |                  |                  |               |
   | 7. Select     |                  |                  |               |
   |    time slot  |                  |                  |               |
   |-------------->|                  |                  |               |
   |               | 8. POST new      |                  |               |
   |               |    appointment   |                  |               |
   |               |----------------->|                  |               |
   |               | 9. Write to      |                  |               |
   |               |    appointments/ |                  |               |
   |               |    slot_bookings |                  |               |
   |               |----------------->|                  |               |
   |               |<-----------------|                  |               |
   |               |   Confirmation   |                  |               |
   |               |                  |                  |               |
   | 10. Booking    |                  |                  |               |
   |     confirmed |                  |                  |               |
   |<--------------|                  |                  |               |
   |               |                  |                  |               |
```

---

## 3. Fingerprint Check-In Flow

```
Resident      RPi4 Kiosk      Firebase RTDB      Web App (Kiosk Page)
   |               |                  |                  |
   |               |                 汗蒸*
   |               |                  |                  |
   | 1. Arrive at  |                  |                  |
   |    kiosk      |                  |                  |
   |-------------->|                  |                  |
   |               | 2. Place finger  |                  |
   |               |    on sensor     |                  |
   |               |--------->+                           |
   |               |           | ESP32 +                   |
   |               |           | AS608                     |
   |               |           | Verify (1:N)              |
   |               |<---------+                           |
   |               | 3. Return        |                  |
   |               |    template ID   |                  |
   |               |    or -1 (fail)  |                  |
   |               |                  |                  |
   |               | 4. Query RTDB    |                  |
   |               |    for user with  |                  |
   |               |    template ID    |                  |
   |               |----------------->|                  |
   |               |<-----------------|                  |
   |               |   User data      |                  |
   |               |                  |                  |
   |               | 5. Check for     |                  |
   |               |    appointment     |                  |
   |               |----------------->|                  |
   |               |<-----------------|                  |
   |               |   Appointment    |                  |
   |               |                  |                  |
   |               | 6. Update        |                  |
   |               |appointment status  |                  |
   |               |    to "completed"  |                  |
   |               |    or "checked_in" |                  |
   |               |----------------->|                  |
   |               |                  | 7. Real-time    |
   |               |                  |    update to      |
   |               |                  |    all listeners  |
   |               |                  |----------------->|
   | 8. Receive    |                  |                  |
   |    queue      |                  |                  |
   |    number     |                  |                  |
   |<--------------|                  |                  |
|               |                  |                  |
   |               | 9. Show result   |                  |
   |               |    (success/fail)|                  |
   |<--------------|                  |                  |
   |               |                  |                  |
```

---

## 4. Fingerprint Enrollment Flow

```
Resident      Web App (Admin)   Firebase RTDB    RPi4 Kiosk    ESP32 + AS608
   |               |                  |               |              |
   | 1. Admin logs |                  |               |              |
   |    in         |                  |               |              |
   |-------------->|                  |               |              |
   |               | 2. Write ENROLL   |               |              |
   |               |    command to     |               |              |
   |               |    kiosk_commands/|               |              |
   |               |----------------->|               |              |
   |               |                  | 3. RPi4 polls |              |
   |               |                  |    every 2s   |              |
   |               |                  |-------------->|              |
   |               |                  | 4. New ENROLL |              |
   |               |                  |    command    |              |
   |               |                  |<--------------|              |
   |               |                  |               | 5. Capture   |
   |               |                  |               |    fingerprint|
   |               |                  |               |    (3 scans) |
   |               |                  |               |--------->+  |
   |               |                  |               |            |  |
   |               |                  |               |            |  |
   |               |                  |               |<-----------+  |
   |               |                  |               | 6. Store     |
   |               |                  |               |    template    |
   |               |                  |               |    on flash    |
   |               |                  |               |              |
   |               |                  | 7. Write       |              |
   |               |                  |    result to   |              |
   |               |                  |    kiosk_status|              |
   |               |                  |<---------------|              |
   |               | 8. Admin sees    |               |              |
   |               |    enrollment    |               |              |
   |               |    result        |               |              |
   |               |<-----------------|               |              |
   |               |                  |               |              |
   | 9. Resident   |                  |               |              |
   |    enrolled |                  |               |              |
   |<--------------|                  |               |              |
```

---

## 5. OTP-Based Self-Enrollment Flow

```
Resident        Web App          Firebase RTDB       RPi4 Kiosk
   |               |                  |                  |
   | 1. Request    |                  |                  |
   |    OTP for    |                  |                  |
   |    enrollment |                  |                  |
   |-------------->|                  |                  |
   |               | 2. Generate OTP  |                  |
   |               |    and store in  |                  |
   |               |    user profile  |                  |
   |               |----------------->|                  |
   |               |                  |                  |
   | 3. Show OTP   |                  |                  |
   |    to user    |                  |                  |
   |<--------------|                  |                  |
   |               |                  |                  |
   | 4. RPi4 kiosk |                  |                  |
   |    polls user |                  |                  |
   |    for OTP    |                  |                  |
   |               |                  |----------------->|
   |               |                  | 5. Verify OTP   |
   |               |                  |    against RTDB  |
   |               |                  |    user record    |
   |               |                  |<-----------------|
   |               |                  |                  |
   | 6. User       |                  |                  |
   |    enters OTP |                  |                  |
   |-------------->|                  |                  |
   |               |                  |                  |
   |               |                  | 7. If valid,    |
   |               |                  |    trigger enroll |
   |               |                  |    on ESP32       |
   |               |                  |----------------->|
   |               |                  |                  |
   | 8. Show       |                  |                  |
   |    enrollment |                  |                  |
   |    guide      |                  |                  |
   |<--------------|                  |                  |
```

---

## 6. Real-Time Queue Update Flow

```
Web Browser 1   Web Browser 2   Web Browser 3   Firebase RTDB   RPi4 Kiosk
      |               |               |               |               |
      | 1. Subscribe  | 1. Subscribe  | 1. Subscribe  |               |
      |    to queue   |    to queue   |    to queue   |               |
      |-------------->|               |               |               |
      |               |-------------->|               |               |
      |               |               |-------------->|               |
      |               |               |               |               |
      |               |               |               |               |
      |               |               |               | 2. RPi4 updates|
      |               |               |               |    appointment   |
      |               |               |               |    status or     |
      |               |               |               |    queue number  |
      |               |               |               |<---------------|
      |               |               |               |                |
      | 3. WebSocket  | 3. WebSocket   | 3. WebSocket   |               |
      |    push       |    push       |    push       |               |
      |<--------------|<--------------|<--------------|               |
      |               |               |               |               |
      | 4. All browsers|               |               |               |
      |    see updated |              |               |               |
      |    queue       |               |               |               |
      |               |               |               |               |
```

---

## 7. K.propTypes = {
  ESP32 Fingerprint Operations Flow

```
+-----------+
| START     |
+-----+-----+
      |
      v
+-----+-----+     +------------------+
| Receive   | --->| Command: ENROLL  |
| Command   |     | ENROLL:<id>      |
+-----+-----+     +--------+---------+
      |                    |
      v                    v
+-----+-----+     +------------------+
| Command:  |     | Command: VERIFY  |
| DELETE    |     +--------+---------+
| DELETE:<id>     |
+-----+-----+              |
      |                    v
      v           +--------+---------+
+-----+-----+     | Capture fingerprint|
| Command:  |     | (getImage)         |
| LIST      |     +--------+---------+
+-----+-----+              |
      |                    v
      v           +--------+---------+
+-----+-----+     | Convert to feature |
| Parse     |     | vector (image2Tz)  |
| Command   |     +--------+---------+
+-----+-----+              |
      |                    v
      v           +--------+---------+
+-----+-----+     | If ENROLL:         |
| Dispatch  |     | createModel()      |
| Handler   |     | storeModel(id)     |
+-----+-----+     |--------|----------|
      |           | If VERIFY:          |
      v           | fingerFastSearch()  |
+-----+-----+     +--------+------------+
| Execute   |              |
| on ESP32  |              v
+-----+-----+     +--------+--------+
      |           | Return result:    |
      v           | - ENROLL: SUCCESS/|
+-----+-----+     |   FAIL            |
| Send      |     | - VERIFY: ID or   |
| Response  |     |   NOT_FOUND       |
| to RPi4   |     +--------+--------+
+-----+-----+              |
      |                    v
      v           +--------+--------+
+-----+-----+     | RPi4 updates     |
| END       |     | RTDB with result |
+-----------+     +------------------+
```

---

## 8. Kiosk Boot & Initialization Flow

```
+-------------+
|   START     |
+------+------+
       |
       v
+------+------+
| RPi4 Boots  |
+------+------+
       |
       v
+------+------+
| systemd     |
| starts      |
| kiosk-firebase
| .service    |
+------+------+
       |
       v
+------+------+
| main.py     |
| starts      |
+------+------+
       |
       v
+------+------+     +---------+
| Initialize  |---->| FAIL    |
| Firebase    |     | Log error,
| connection  |     | retry     |
+------+------+     +---------+
       |
       v
+------+------+
| Initialize  |
| serial port |
| /dev/ttyUSB0|
+------+------+
       |
       v
+------+------+     +---------+
| ESP32       |---->| FAIL    |
| detected?   |     | Retry   |
+------+------+     +---------+
       |
       v
+------+------+
| Show Home   |
| Screen      |
+------+------+
       |
       v
+------+------+
| Write online|     +-------------------+
| status to   |---->| ERROR             |
| kiosk_status|     | Write offline     |
| in RTDB     |     | update RTDB       |
+------+------+     +-------------------+
       |
       v
+------+------+
| Start       |
| polling     |
| loop        |
| (2s interval)
+------+------+
       |
       v
+-------------+
|   RUNNING   |
+-------------+
```

---

## 9. Web App Authentication Flow

```
+-------------+
|   START     |
+------+------+
       |
       v
+------+------+
| User clicks |
| "Sign In"   |
+------+------+
       |
       v
+------+------+
| Enter       |
| email &     |
| password    |
+------+------+
       |
       v
+------+------+
| firebase    |
| auth().     |
| signInWith- |
| EmailAndPassword() |
+------+------+
       |
       v
+------+------+     +---------+
| Auth        |---->| FAIL    |
| successful? |     | Show    |
+------+------+     | error   |
       |            +---------+
       v
+------+------+
| Store user  |
| in          |
| AuthContext |
| & localStorage|
+------+------+
       |
       v
+------+------+
| Set user    |
| role in     |
| state       |
+------+------+
       |
       v
+------+------+     +---------+
| Role ===    |---->| RESIDENT|
| 'admin'?    |     | Redirect|
+------+------+     | to      |
       |            | /my-     |
       |            | appointments|
       v            +---------+
+------+------+
| Redirect to |
| /dolores-    |
| taytay-      |
| admin        |
+------+------+
       |
       v
+------+------+
| Subscribe   |
| to RTDB     |
| listeners   |
+------+------+
       |
       v
+-------------+
|   READY     |
+-------------+
```
