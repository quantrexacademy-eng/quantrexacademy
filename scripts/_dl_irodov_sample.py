#!/usr/bin/env python3
import ssl, urllib.request
from pathlib import Path

CTX = ssl.create_default_context()
dest = Path(r"C:\Users\Admin\qx-hosting\data\_migration\_wm_test\irodov_AKCR2_1.webp")
dest.parent.mkdir(parents=True, exist_ok=True)
url = "https://cdn-question-pool.getmarks.app/2026_modules/jee_advanced_physics/AKCR2_1.webp"
req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://web.getmarks.app/",
    "Origin": "https://web.getmarks.app",
    "Accept": "image/*,*/*",
})
with urllib.request.urlopen(req, timeout=30, context=CTX) as r:
    dest.write_bytes(r.read())
print("saved", dest, dest.stat().st_size)

# find local matches for 404 names
from pathlib import Path
root = Path(r"C:\Users\Admin\qx-hosting\data\_migration\bake_tmp\pyq")
need = ["06APRS2", "q66_d1", "28S1_q_52", "04APRS1__q66"]
for pat in need:
    hits = list(root.rglob(f"*{pat}*"))
    print(pat, "hits", len(hits))
    for h in hits[:5]:
        print(" ", h.relative_to(root), h.stat().st_size)
