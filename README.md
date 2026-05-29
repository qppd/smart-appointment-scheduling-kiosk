# Smart Appointment Scheduling Kiosk

> **Web-based Appointment Scheduling System with Automated Conflict Detection and Fingerprint Authentication Kiosk**
> *Barangay Dolores, Taytay, Rizal*

## Overview

A full-stack appointment scheduling system that eliminates manual queuing at Barangay Dolores. Residents register online, visit the hall to activate their account and enroll fingerprints, then book appointments from home. On appointment day, they check in via fingerprint at the kiosk.

## Architecture

```
src/
  web/                # Web application
    frontend/         # React + Tailwind + Vite
    backend/          # FastAPI + PostgreSQL
    docker-compose.yml
    vercel.json
  rpi/                # RPi4 kiosk software
  esp/                # ESP32 firmware (AS608 fingerprint sensor)
docs/                 # Documentation
```

## Quick Start

```bash
# Backend
cd src/web/backend
pip install -r requirements.txt
cp ../../.env.example .env
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd src/web/frontend
npm install
npm run dev
```

## User Flow

1. **Register online** -> OTP verification via SMS
2. **Visit barangay hall** -> Account activation + fingerprint enrollment
3. **Book online** -> Select service, date, time
4. **Check-in at kiosk** -> Fingerprint scan -> Confirmed

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| Kiosk | Raspberry Pi 4, Python Tkinter |
| Biometrics | ESP32 + AS608 fingerprint sensor |
| SMS | Semaphore API (Philippines) |
| Deployment | Vercel (frontend), VPS (backend) |
