# ESP32 Firmware — Manual Test Plan

## Prerequisites
- Arduino IDE 2.x with ESP32 board support installed
- ESP32 wired to AS608 fingerprint sensor
- Serial Monitor open at 115200 baud

## Test 1: Power-On / Ping
1. Upload firmware to ESP32
2. Open Serial Monitor (115200 baud)
3. Expected: `OK:Fingerprint sensor initialized` and `OK:ESP32 ready`
4. Send: `PING`
5. Expected: `PONG`

## Test 2: Template Count
1. Send: `FP_COUNT`
2. Expected: `OK:<number>` (0 if no templates enrolled)

## Test 3: Fingerprint Enrollment
1. Send: `FP_ENROLL:1`
2. Place finger on AS608 when prompted
3. Remove finger when prompted
4. Place SAME finger again
5. Expected: `FP_ENROLLED:1`
6. If it fails: check finger placement, verify wiring

## Test 4: Verify Matched Fingerprint
1. Send: `FP_VERIFY`
2. Place same enrolled finger
3. Expected: `FP_MATCH:1`

## Test 5: Verify Unmatched Fingerprint
1. Send: `FP_VERIFY`
2. Place a DIFFERENT finger (not enrolled)
3. Expected: `FP_NO_MATCH`

## Test 6: Get Last Match ID
1. Place enrolled finger and send `FP_VERIFY`
2. Then send: `FP_ID`
3. Expected: `OK:1`

## Test 7: Delete Single Template
1. Send: `FP_DELETE:1`
2. Expected: `OK`
3. Send: `FP_COUNT`
4. Expected: `OK:0`

## Test 8: Multiple Enrollments
1. `FP_ENROLL:1` — enroll finger 1
2. `FP_ENROLL:2` — enroll finger 2 (same or different person)
3. `FP_COUNT` — expected `OK:2`

## Test 9: Clear All Templates
1. `FP_CLEAR`
2. Expected: `OK`
3. `FP_COUNT` — expected `OK:0`

## Test 10: Error Handling
| Test | Command | Expected |
|------|---------|----------|
| Invalid ID | `FP_ENROLL:0` | `ERR:ID must be 1-127` |
| ID too high | `FP_ENROLL:200` | `ERR:ID must be 1-127` |
| Unknown cmd | `FOOBAR` | `ERR:Unknown command - FOOBAR` |
| Delete missing | `FP_DELETE:99` | `ERR:Delete failed` |

## Test 11: Enrollment Edge Cases
1. Don't place finger when `FP_ENROLL:3` is sent — wait 15 seconds
2. Expected: `ERR:No finger detected`
3. Place finger but remove before second scan — should print `ERR:No finger detected on second scan`

## Test 12: Buffer Overflow
1. Send a command that is 100+ characters long
2. Expected: the command is truncated safely, not crashing
