"""Minimal dev server — no uvicorn CLI, run directly with Python."""
import asyncio
import os

# Force env vars before ANY imports
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./barangay_kiosk.db")
os.environ.setdefault("SECRET_KEY", "dev-secret-key-insecure-12345")

# Now import the app modules
from app.main import app
import uvicorn

if __name__ == "__main__":
    print("🚀 Starting Smart Appointment Kiosk backend on http://localhost:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")