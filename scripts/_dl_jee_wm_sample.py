#!/usr/bin/env python3
import ssl, urllib.request
from pathlib import Path
CTX = ssl.create_default_context()
url = "https://cdn-question-pool.getmarks.app/pyq/jee_main_2026_april_watermarked/06APRS2__q66_d1.jpg"
dest = Path(r"C:\Users\Admin\qx-hosting\data\_migration\_wm_test\06APRS2__q66_d1.jpg")
req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://web.getmarks.app/",
    "Origin": "https://web.getmarks.app",
    "Accept": "image/*,*/*",
})
with urllib.request.urlopen(req, timeout=30, context=CTX) as r:
    dest.write_bytes(r.read())
print("saved", dest.stat().st_size, r.status if False else 200)
