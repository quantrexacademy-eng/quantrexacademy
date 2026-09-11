#!/usr/bin/env python3
import json, re, ssl, urllib.parse, urllib.request
from pathlib import Path
raw = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json").read_text(encoding="utf-8"))
rx = re.compile(r'src=["\']([^"\']+)["\']')
cdn = fb = 0
for q in raw["questions"]:
    if "2026" not in str(q.get("source") or ""):
        continue
    blob = str(q.get("q") or "") + " " + str(q.get("solution") or "") + " " + " ".join(map(str, q.get("options") or []))
    for u in rx.findall(blob):
        if "getmarks" in u:
            cdn += 1
        if "firebasestorage" in u:
            fb += 1
print("jee2026 getmarks", cdn, "firebase", fb)
u = (
    "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/"
    + urllib.parse.quote("questions/figs/pyq/jee_main_2026_watermark_improved/28S2_o_61_1_1_v2.png", safe="")
    + "?alt=media"
)
req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=20, context=ssl.create_default_context()) as r:
    print("opt fig firebase", r.status, r.headers.get("content-type"), r.headers.get("content-length"))
