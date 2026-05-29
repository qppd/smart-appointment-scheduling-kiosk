# Hardware Setup Guide

## Bill of Materials

| Component | Quantity |
|-----------|----------|---------------------|
| Raspberry Pi 4 (4GB) | 1 | 
| AS608 Fingerprint Sensor | 1 | 
| ESP32 Development Board | 1 | 
| 7-inch Touchscreen LCD | 1 | 
| MicroSD Card (32GB) | 1 |
| Power Supply (5V/3A) | 1 | 
| Jumper Wires | 1 pack | 
| USB Cable (micro) | 1 |
| Enclosure / 3D Printed Case | 1 |

## Wiring Diagram

### ESP32 to AS608 (Fingerprint Sensor)

| ESP32 Pin | AS608 Pin |
|-----------|-----------|
| 3.3V | VCC |
| GND | GND |
| GPIO16 (RX2) | TX (White wire) |
| GPIO17 (TX2) | RX (Green wire) |

### RPi4 to ESP32

| RPi4 GPIO | ESP32 Pin |
|-----------|-----------|
| GPIO14 (TXD) | RX (GPIO3) |
| GPIO15 (RXD) | TX (GPIO1) |
| GND | GND |
| 5V (Pin 2) | VIN (if using 5V ESP32) |

## Assembly Steps

1. **Connect AS608 to ESP32** using the wiring table above
2. **Connect ESP32 to RPi4** via UART (no USB needed for production)
3. **Connect touchscreen** to RPi4's DSI or HDMI port
4. **Power the RPi4** with 5V/3A supply

## RPi4 Setup

```bash
# Install Raspberry Pi OS Lite (64-bit)
# Enable UART and SPI
sudo raspi-config
# Interface Options -> Serial Port -> Login shell over serial? NO
# Interface Options -> Serial Port -> Serial hardware enabled? YES

# Install required packages
sudo apt update
sudo apt install -y python3-pip python3-tk git

# Disable Bluetooth to free UART (optional)
echo "dtoverlay=disable-bt" | sudo tee -a /boot/config.txt

# Reboot
sudo reboot
```

## Troubleshooting

### Fingerprint sensor not detected
- Check wiring: AS608 VCC to 3.3V (NOT 5V)
- Ensure baud rate matches: AS608 default is 57600
- Run PlatformIO monitor to see debug output

### Serial communication issues
- Verify UART is enabled on RPi4
- Check RPi4 TX goes to ESP32 RX and vice versa
- Ground must be shared between all devices
