# Hardware & Software Specifications

## 1. Hardware Specifications

### 1.1 Raspberry Pi 4 (Kiosk Host)

| Specification | Details |
|---------------|---------|
| **Model** | Raspberry Pi 4 Model B (any variant, 4GB recommended) |
| **CPU** | Broadcom BCM2711, Quad-core Cortex-A72 (ARM v8) @ 1.5GHz |
| **RAM** | 4GB LPDDR4 |
| **Storage** | MicroSD Card (minimum 32GB, class 10) |
| **Networking** | Gigabit Ethernet, 802.11ac Wi-Fi, Bluetooth 5.0 |
| **GPIO** | 40-pin GPIO header |
| **Power** | 5V/3A via USB-C |
| **Operating System** | Raspberry Pi OS Lite (64-bit) |

### 1.2 ESP32 Development Board

| Specification | Details |
|---------------|---------|
| **Chip** | ESP32-D0WDQ6 (or equivalent) |
| **CPU** | Xtensa LX6 dual-core @ 240MHz |
| **RAM** | 520KB SRAM |
| **Wireless** | 802.11 b/g/n Wi-Fi, Bluetooth 4.2 |
| **GPIO** | 34 programmable GPIOs |
| **Operating Voltage** | 3.3V logic (5V tolerant on some pins) |
| **Flash** | 4MB SPI flash (typical) |
| **USB Interface** | CP2102 or CH340 USB-to-UART bridge |

### 1.3 AS608 Fingerprint Sensor

| Specification | Details |
|---------------|---------|
| **Sensor Type** | Optical fingerprint sensor |
| **Interface** | UART (TTL) |
| **Baud Rate** | 57600 (default, configurable) |
| **Operating Voltage** | 3.3V DC (IMPORTANT: NOT 5V) |
| **Operating Current** | ~20mA (active), <10uA (sleep) |
| **Template Storage** | 162 fingerprint templates |
| **Security Level** | 5 configurable levels |
| **Fingerprint Image** | Character file (256 bytes) |
| **Template Size** | 512 bytes per template |
| **Module Colors** | Black PCB with green LED indicator |
| **Connector** | 4-pin JST (VCC, GND, TX, RX) |

### 1.4 Display (Touchscreen LCD)

| Specification | Details |
|---------------|---------|
| **Size** | 7 inches (recommended) or 5 inches |
| **Resolution** | 800x480 or 1024x600 |
| **Interface** | HDMI + USB (touch) or DSI |
| **Touch Type** | Capacitive multi-touch |
| **Power** | 5V via USB or GPIO |

### 1.5 Power Supply

| Specification | Details |
|---------------|---------|
| **RPi4 Power** | 5V/3A USB-C power adapter (official recommended) |
| **ESP32 Power** | Powered via USB from RPi4 or separate 5V/500mA |
| **Touchscreen Power** | USB-powered from RPi4 |
| **Total Power Draw** | ~15-20W (with all peripherals) |
| **UPS (Optional)** | UPS HAT for power backup during outages |

### 1.6 Enclosure

| Specification | Details |
|---------------|---------|
| **Type** | 3D printed or commercial metal/plastic case |
| **Mounting** | VESA mount compatible (recommended) |
| **Cooling** | Passive or with small fan |
| **Protection** | IP54 (dust/water resistant, optional) |
| **Cable Management** | Integrated cable routing (for clean kiosk appearance) |

## 2. Software Specifications

### 2.1 Web Application

| Specification | Details |
|---------------|---------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.5 |
| **UI Library** | React 18.3 |
| **Styling** | Tailwind CSS 3.4 |
| **Build Output** | Static HTML export |
| **Browser Support** | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| **Deployment** | Vercel (static hosting) |

### 2.2 Raspberry Pi 4 Kiosk

| Specification | Details |
|---------------|---------|
| **Runtime** | Python 3.12+ |
| **GUI Framework** | customtkinter 5.2.2 |
| **Window Mode** | Fullscreen (kiosk mode) |
| **Auto-start** | systemd service |
| **Serial Handling** | pyserial (USB auto-detect) |
| **Image Processing** | Pillow 10.4 |
| **Environment** | .env file (sourced at startup) |

### 2.3 ESP32 Firmware

| Specification | Details |
|---------------|---------|
| **Platform** | Arduino Framework (ESP32 core) |
| **IDE** | Arduino IDE 2.x |
| **Board Package** | esp32 by Espressif Systems |
| **Upload Speed** | 921600 baud |
| **Flash Mode** | QIO |
| **Flash Size** | 4MB |
| **Partition Scheme** | Default 4MB with spiffs |
| **Core Debug Level** | None (production) / Verbose (debug) |

### 2.4 Firebase Configuration

| Specification | Details |
|---------------|---------|
| **Authentication** | Email/Password provider (enabled) |
| **Database** | Realtime Database (not Firestore) |
| **Region** | us-central1 (default) or nearest region |
| **Security Rules** | JSON-based access control |
| **Admin SDK** | Service account JSON (stored on RPi4) |

## 3. Network Specifications

| Component | Protocol | Port | Direction |
|-----------|----------|------|-----------|
| Web App to Firebase | HTTPS | 443 | Outbound |
| RPi4 to Firebase | HTTPS | 443 | Outbound |
| RPi4 to ESP32 | Serial (USB) | N/A | Local |
| ESP32 to Wi-Fi | WPA2/3 | N/A | Outbound (optional) |
| Vercel CDN to Web Users | HTTPS | 443 | Inbound/Outbound |

## 4. Storage Specifications

### Firebase RTDB

| Node | Estimated Size | Growth |
|------|---------------|--------|
| `users/` | ~1KB per user | Linear with users |
| `services/` | ~500B per service | Static (rarely changes) |
| `appointments/` | ~2KB per appointment | Linear with appointments |
| `kiosk_commands/` | ~500B per command | Ephemeral (auto-deleted) |
| `kiosk_status/` | ~500B per kiosk | Static (one per kiosk) |

### Local Storage (RPi4)

| Storage | Size | Purpose |
|---------|------|---------|
| **OS (SD Card)** | 8GB+ | Raspberry Pi OS Lite |
| **Application** | ~100MB | Python code, images |
| **Logs** | ~50MB/month | Application logs |
| **Firebase Creds** | ~2KB | Service account JSON |
| **Total Recommended** | 32GB | MicroSD Card |

## 5. Performance Specifications

| Metric | Target |
|--------|--------|
| **Web App Load Time** | < 3 seconds (on 3G) |
| **Web App TTI** | < 5 seconds |
| **Firebase Sync Latency** | < 200ms (typical) |
| **RPi4 Command Poll Interval** | 2 seconds |
| **Fingerprint Scan Time** | < 1 second |
| **Fingerprint Match Time** | < 2 seconds (1:N search) |
| **Serial Communication** | 115200 baud |
| **Kiosk UI Response** | < 100ms |
| **Concurrent Web Users** | Unlimited (Firebase scales) |
| **Fingerprint Templates** | 162 max (AS608 limit) |
