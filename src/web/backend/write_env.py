#!/usr/bin/env python3
"""Set Supabase keys in .env. Usage: python write_env.py [anon_key] [service_key]"""
import os, sys

path = os.path.join(os.path.dirname(__file__), '.env')

if len(sys.argv) >= 3:
    anon = sys.argv[1]
    srv = sys.argv[2]
else:
    print("Usage: python write_env.py <anon_key> <service_key>")
    sys.exit(1)

lines = [
    "DATABASE_URL=postgresql+asyncpg://postgres.ueikfwdcnndqmkrjquug:dtSAi9NhQkwvkOzW@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require",
    "SUPABASE_URL=https://ueikfwdcnndqmkrjquug.supabase.co",
    f"SUPABASE_ANON_KEY={anon}",
    f"SUPABASE_SERVICE_KEY={srv}",
    "SECRET_KEY=supaba...AY",
    "USE_SUPABASE_OTP=true",
    'CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]',
    "SEMAPHORE_API_KEY=mock",
    "SEMAPHORE_SENDER_NAME=BARANGAY",
]

content = "\n".join(lines) + "\n"
with open(path, 'w') as f:
    f.write(content)

print(f"Written {len(content)} bytes to {path}")
for l in lines:
    k, v = l.split("=", 1)
    print(f"  {k}: {len(v)} chars")