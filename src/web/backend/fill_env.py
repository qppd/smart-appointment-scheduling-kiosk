#!/usr/bin/env python3
"""Fill Supabase keys into .env placeholders. Usage: python fill_env.py <anon_key> <service_key>"""
import os, sys

path = os.path.join(os.path.dirname(__file__), '.env')

if len(sys.argv) < 3:
    print("Usage: fill_env.py <anon_key> <service_key>")
    sys.exit(1)

with open(path) as f:
    content = f.read()

content = content.replace("PLACEHOLDER_ANON", sys.argv[1])
content = content.replace("PLACEHOLDER_SRV", sys.argv[2])

with open(path, 'w') as f:
    f.write(content)

print("Done! .env updated with keys")
for line in content.split("\n"):
    if "ANON_KEY" in line or "SERVICE_KEY" in line:
        k, v = line.split("=", 1)
        print(f"  {k}: {len(v)} chars")