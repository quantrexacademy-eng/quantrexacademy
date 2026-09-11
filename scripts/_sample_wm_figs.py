#!/usr/bin/env python3
"""Download a few live/local figures to inspect Marks watermark."""
from pathlib import Path
import json, ssl, urllib.request, re

ROOT = Path(r"C:\Users\Admin\qx-hosting")
OUT = ROOT / "data" / "_migration" / "_wm_test"
OUT.mkdir(parents=True, exist_ok=True)
CTX = ssl.create_default_context()

# local book figs
local = [
    ROOT / "assets/diagrams/qx-book-26a04af3be7a5e53.png",
    ROOT / "assets/diagrams/hcv-v2-obj-chapter_31_capacitors_figure_31_q1.png",
]
for i, p in enumerate(local):
    if p.exists():
        dest = OUT / f"local_{i}_{p.name}"
        dest.write_bytes(p.read_bytes())
        print("saved", dest.name, dest.stat().st_size)

# firebase samples from map
t = (ROOT / "data/_migration/selfdep_url_map.json").read_text(encoding="utf-8")[:25000]
urls = re.findall(r"https://firebasestorage.googleapis.com[^\"\\]+", t)
seen = []
for u in urls:
    if u not in seen:
        seen.append(u)
    if len(seen) >= 4:
        break
for i, u in enumerate(seen):
    dest = OUT / f"fb_{i}.png"
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=25, context=CTX) as r:
            dest.write_bytes(r.read())
        print("fb", i, dest.stat().st_size, u[80:140])
    except Exception as e:
        print("fb fail", i, e)
print("done", list(OUT.glob("*.png"))[:10])
