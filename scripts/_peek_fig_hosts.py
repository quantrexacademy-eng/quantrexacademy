#!/usr/bin/env python3
import json, re
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
org = ROOT / "data/books/chapters/6a4ce383c59a7b462185330f"
print("ORGANIC CHAPTERS")
for p in sorted(org.glob("*.json")):
    t = p.read_text(encoding="utf-8", errors="ignore")[:2500]
    m = re.search(r'"chapter"\s*:\s*"([^"]+)"', t)
    ch = m.group(1) if m else "?"
    print(" ", ch)

iro = ROOT / "data/books/chapters/69cfb5366ecf5579037d96a4"
print("IRODOV CHAPTERS", len(list(iro.glob('*.json'))))
for p in sorted(iro.glob("*.json"))[:8]:
    t = p.read_text(encoding="utf-8", errors="ignore")[:1500]
    m = re.search(r'"chapter"\s*:\s*"([^"]+)"', t)
    print(" ", m.group(1) if m else "?", "imgs", len(re.findall(r"<img", t, re.I)))

raw = json.loads((ROOT / "data/banks/jee_main.json").read_text(encoding="utf-8"))
qs = raw["questions"]
n_fb = n_marks = n_proxy = n_local = n_img = n_broken = 0
srcs = []
for q in qs:
    if "2026" not in str(q.get("source") or ""):
        continue
    blob = str(q.get("q") or "") + " " + str(q.get("solution") or "") + " " + " ".join(map(str, q.get("options") or []))
    imgs = re.findall(r'src=["\']([^"\']+)["\']', blob)
    for u in imgs:
        n_img += 1
        if "firebasestorage" in u:
            n_fb += 1
        elif "proxy-image" in u:
            n_proxy += 1
        elif "getmarks" in u or "cdn-question" in u:
            n_marks += 1
        elif "/assets/" in u:
            n_local += 1
        if "https://.app/" in u:
            n_broken += 1
        if len(srcs) < 8:
            srcs.append(u[:160])
print("jee2026 imgs", n_img, "fb", n_fb, "marks", n_marks, "proxy", n_proxy, "local", n_local, "broken_host", n_broken)
for s in srcs:
    print(" ", s)
