# UART Protocol Specification - RPi4 <-> ESP32

## Overview

The RPi4 communicates with the ESP32 over UART (serial) at **115200 baud**.
The ESP32 controls the AS608 fingerprint sensor and handles biometric operations.

## Hardware Connection

| RPi4 GPIO | ESP32 Pin | Purpose |
|-----------|-----------|---------|
| TX (GPIO14) | RX (GPIO16) | RPi4 sends commands |
| RX (GPIO15) | TX (GPIO17) | ESP32 sends responses |
| GND | GND | Common ground |
| 3.3V | VCC | Power |

## Command Format

ASCII text strings terminated with newline: `COMMAND[:PARAM1]\n`

## Available Commands

| Command | Description | Response |
|---------|-------------|----------|
| PING | Check if alive | PONG |
| FP_ENROLL:<id> | Enroll fingerprint at specific ID (1-127) | Step-by-step OK + FP_ENROLLED:<id> or ERR:... |
| FP_AUTOENROLL | Enroll fingerprint to next available ID | Step-by-step OK + FP_ENROLLED:<id> or ERR:... |
| FP_VERIFY | Scan and match (waits for finger) | FP_MATCH:<id> or FP_NO_MATCH or ERR:... |
| FP_SEARCH | Search for a fingerprint | FP_MATCH:<id> or FP_NO_MATCH or ERR:... |
| FP_DELETE:<id> | Delete template | OK or ERR:... |
| FP_COUNT | Get template count | OK:<count> |
| FP_ID | Get last matched ID | OK:<id> or ERR:No match |
| FP_LIST | List all enrolled template IDs | OK:<count> + ID:<id> lines |
| FP_CLEAR | Delete all templates | OK or ERR:... |
| FP_MONITOR | Toggle continuous monitoring mode | OK:Monitor ON / OK:Monitor OFF |

## Example Flow

### Basic Ping
```
> PING
< PONG
```

### Enroll at Specific ID
```
> FP_ENROLL:1
< OK:Place finger on sensor
[User places finger]
< OK:Hold still...
< FP_ENROLLED:1
```

### Auto-Enroll (finds next available ID)
```
> FP_AUTOENROLL
< OK:Place finger on sensor
[User places finger]
< OK:Hold still...
< FP_ENROLLED:3
```

### Verify Fingerprint
```
> FP_VERIFY
< OK:Place finger on sensor for verification
[User places finger]
< FP_MATCH:1
```

### Continuous Monitoring Mode
```
> FP_MONITOR
< OK:Monitor ON
[ESP32 now checks for fingerprints every 500ms]
[When finger is detected and matched:]
< FP_MATCH:5
[When finger is detected but no match:]
< FP_NO_MATCH
> FP_MONITOR
< OK:Monitor OFF
```

### List Enrolled IDs
```
> FP_LIST
< OK:3
< ID:1
< ID:5
< ID:12
```

### Search (one-shot)
```
> FP_SEARCH
< OK:Searching...
< FP_MATCH:2
```

## Debug Output

The ESP32 also sends `[DEBUG]` prefixed messages to the serial monitor for
development and troubleshooting. These are informational and should be ignored
by the RPi4 parser. Lines starting with `[DEBUG]` do not carry protocol data.
