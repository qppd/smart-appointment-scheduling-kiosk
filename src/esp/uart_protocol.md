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
| FP_ENROLL:<id> | Enroll fingerprint (1-127) | FP_ENROLLED:<id> or ERR:... |
| FP_VERIFY | Scan and match | FP_MATCH:<id> or FP_NO_MATCH |
| FP_DELETE:<id> | Delete template | OK or ERR:... |
| FP_COUNT | Get template count | OK:<count> |
| FP_ID | Get last matched ID | OK:<id> or ERR:No match |
| FP_CLEAR | Delete all templates | OK or ERR:... |

## Example Flow

```
> PING
< PONG
> FP_ENROLL:1
< OK:Place finger on sensor for enrollment ID 1
[User places finger]
< OK:Remove finger
[User removes finger]
< OK:Place same finger again
[User places finger again]
< FP_ENROLLED:1
> FP_VERIFY
< OK:Place finger on sensor
[User places finger]
< FP_MATCH:1
```
