#!/usr/bin/env python3
"""Set JWT keys in .env with no truncation issues.
Usage: python3 setkeys.py <anon_key> <srv_key>
Keys with dots/special chars: put them in quotes."""
import sys, os

path = os.path.join(os.path.dirname(__file__), '.env')

if len(sys.argv) < 3:
    print("Need 2 args: anon_key srv_key")
    sys.exit(1)

with open(path) as f:
    content = f.read()

content = content.replace("SUPABASE_ANON_KEY=", f"SUPABASE_ANON_KEY={sys.argv[1]}")
content = content.replace("SUPABASE_SERVICE_KEY=", f"SUPABASE_SERVICE_KEY={sys.argv[2]}")

with open(path, 'w') as f:
    f.write(content)

print("Keys written!")
for line in content.split('\n'):
    if 'ANON_KEY=' in line or 'SERVICE_KEY=' in line:
        k, v = line.split('=', 1)
        print(f"  {k}: {len(v)} chars")