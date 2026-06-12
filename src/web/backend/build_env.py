#!/usr/bin/env python3
"""Build .env from .keys.tmp placeholder file. 
Put two lines in .keys.tmp:
  ANON=<full_anon_key>
  SRV=<full_service_key>
Then run this script."""
import os

dir_path = os.path.dirname(os.path.realpath(__file__))
env_path = os.path.join(dir_path, '.env')
keys_path = os.path.join(dir_path, '.keys.tmp')

# Read keys from .keys.tmp
keys = {}
with open(keys_path) as f:
    for line in f:
        line = line.strip()
        if '=' in line:
            k, v = line.split('=', 1)
            keys[k.strip()] = v.strip()

# Build .env content
# The user's anon key has three dot-separated parts but the file 
# might have it with dots already - just use it as-is
anon = keys.get('ANON', '')
srv = keys.get('SRV', '')

lines = []
lines.append("DATABASE_URL=postgresql+asyncpg://postgres.ueikfwdcnndqmkrjquug:dtSAi9NhQkwvkOzW@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require")
lines.append("SUPABASE_URL=https://ueikfwdcnndqmkrjquug.supabase.co")
lines.append(f"SUPABASE_ANON_KEY={anon}")
lines.append(f"SUPABASE_SERVICE_KEY={srv}")
lines.append("SECRET_KEY=***    lines.append("USE_SUPABASE_OTP=true")
lines.append('CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]')
lines.append("SEMAPHORE_API_KEY=***    lines.append("SEMAPHORE_SENDER_NAME=BARANGAY")

content = "\n".join(lines) + "\n"
with open(env_path, 'w') as f:
    f.write(content)

print(f"Written {len(content)} bytes to {env_path}")
print(f"  SUPABASE_ANON_KEY: {len(anon)} chars")
print(f"  SUPABASE_SERVICE_KEY: {len(srv)} chars")