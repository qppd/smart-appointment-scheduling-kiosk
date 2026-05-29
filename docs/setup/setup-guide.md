# Setup Guide

## Prerequisites

- Node.js 18+
- Python 3.12+
- PostgreSQL 16+
- Redis 7+ (optional, for caching)
|- Arduino IDE 2.x (for ESP32 firmware)
- Raspberry Pi 4 with Raspberry Pi OS Lite (for kiosk)

## 1. Backend Setup

```bash
cd src/web/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp ../../.env.example .env
# Edit .env with your database URL and secrets

# Run database migrations
alembic upgrade head

# Start the server
python run.py
# Or: uvicorn app.main:app --reload
```

## 2. Frontend Setup

```bash
cd src/web/frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Set VITE_API_URL to your backend URL

# Start development server
npm run dev
```

## 3. Docker Setup (Alternative)

```bash
cd src/web

# Start all services
docker-compose up -d

# Backend runs at http://localhost:8000
# Frontend runs at http://localhost:5173
```

## 4. ESP32 Firmware (Arduino IDE)

1. Open **Arduino IDE 2.x**
2. Add ESP32 board support: **File > Preferences** > paste `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json` into **Additional Boards Manager URLs**
3. Install board support: **Tools > Board > Boards Manager** > search "ESP32" > install by Espressif
4. Install libraries: **Tools > Manage Libraries** > search and install:
   - **Adafruit Fingerprint Sensor Library**
   - **Adafruit BusIO**
5. Open the sketch: **File > Open** > `src/esp/fingerprint_controller/fingerprint_controller.ino`
6. Select board: **Tools > Board > ESP32 Arduino > ESP32 Dev Module**
7. Select port: **Tools > Port > COMx (ESP32)**
8. Click **Upload**

> See `src/esp/README.md` for detailed Arduino IDE setup instructions.

## 5. RPi4 Kiosk

```bash
# On the Raspberry Pi 4
cd src/rpi

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run the kiosk application
python main.py
```

## 6. Deployment

### Frontend (Vercel)
```bash
cd src/web/frontend
npm run build
vercel --prod
```

### Backend (VPS)
```bash
cd src/web/backend
docker build -t barangay-kiosk-api .
docker run -d -p 8000:8000 --env-file .env barangay-kiosk-api
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SECRET_KEY` | JWT secret key (min 32 chars) | Yes |
| `SUPABASE_URL` | Supabase project URL | For OTP |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | For OTP |
| `SEMAPHORE_API_KEY` | Semaphore SMS API key | For SMS |
| `SEMAPHORE_SENDER_NAME` | SMS sender name | For SMS |
| `CORS_ORIGINS` | Allowed CORS origins | Optional |
