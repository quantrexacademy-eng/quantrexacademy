#!/usr/bin/env python3
import json, re, ssl, urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CTX = ssl.create_default_context()

raw = json.loads((ROOT / "data/banks/jee_main.json").read_text(encoding="utf-8"))
urls = []
for q in raw["questions"]:
    if "2026" not in str(q.get("source") or ""):
        continue
    blob = str(q.get("q") or "") + " " + str(q.get("solution") or "")
    for u in re.findall(r'src=["\']([^"\']+)["\']', blob):
        if "firebasestorage" in u:
            urls.append(u)
            if len(urls) >= 6:
                break
    if len(urls) >= 6:
        break
print("FULL URLS")
for u in urls:
    print(u)
    print("  altmedia", "alt=media" in u, "len", len(u), "endswith", u[-40:])

# amine imgs
org = ROOT / "data/books/chapters/6a4ce383c59a7b462185330f"
amine = None
for p in org.glob("*.json"):
    t = p.read_text(encoding="utf-8", errors="ignore")
    if '"chapter":"Amines"' in t or '"chapter": "Amines"' in t:
        amine = p
        break
print("AMINE FILE", amine)
if amine:
    t = amine.read_text(encoding="utf-8", errors="ignore")
    imgs = re.findall(r'/assets/diagrams/[^"\'>\s]+', t)
    print("amine imgs", len(imgs), "unique", len(set(imgs)))
    for u in list(dict.fromkeys(imgs))[:8]:
        print(" ", u)

# HEAD one firebase
if urls:
    u = urls[0]
    req = urllib.request.Request(u, method="HEAD", headers={"User-Agent": "Mozilla/5.0", "Referer": "https://www.quantrexacademy.com/"})
    try:
        with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
            print("HEAD", r.status, r.headers.get("content-type"), r.headers.get("content-length"))
    except Exception as e:
        print("HEAD fail", type(e).__name__, e)
