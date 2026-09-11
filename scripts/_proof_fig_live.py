#!/usr/bin/env python3
"""Live HTTP proof of JEE 2026 + Irodov/amine figure URLs."""
from __future__ import annotations
import json, re, ssl, urllib.error, urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CTX = ssl.create_default_context()
SRC = re.compile(r'\bsrc=["\']([^"\']+)["\']', re.I)


def get(url, ref="https://www.quantrexacademy.com/"):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Referer": ref, "Accept": "image/*,*/*"})
    try:
        with urllib.request.urlopen(req, timeout=18, context=CTX) as r:
            b = r.read(32)
            return r.status, (r.headers.get("content-type") or "")[:28], int(r.headers.get("content-length") or 0)
    except urllib.error.HTTPError as e:
        return e.code, "err", 0
    except Exception as e:
        return None, type(e).__name__[:20], 0


bank = json.loads((ROOT / "data/banks/jee_main.json").read_text(encoding="utf-8"))
fb, cdn, local = [], [], []
seen = set()
for q in bank["questions"]:
    if "2026" not in str(q.get("source") or ""):
        continue
    blob = str(q.get("q") or "") + " " + str(q.get("solution") or "") + " " + " ".join(map(str, q.get("options") or []))
    for u in SRC.findall(blob):
        if u in seen:
            continue
        seen.add(u)
        if "firebasestorage" in u:
            fb.append(u)
        elif "getmarks" in u:
            cdn.append(u)
        elif "/assets/" in u:
            local.append(u)

print("unique jee2026 fb", len(fb), "cdn", len(cdn), "local", len(local))
st = Counter()
fail = []
for i, u in enumerate(fb):
    code, ct, cl = get(u)
    st[code] += 1
    if code != 200:
        fail.append((code, u[-90:]))
    if (i + 1) % 40 == 0:
        print("  probed", i + 1, dict(st), flush=True)
print("FIREBASE STATUS", dict(st), "fails", len(fail))
for row in fail[:12]:
    print(" FAIL", row)

print("CDN leftover", len(cdn))
for u in cdn:
    code, ct, cl = get(u, "https://web.getmarks.app/")
    print(" ", code, cl, u.split("/")[-1][:70])

print("LOCAL disk")
for u in local[:8]:
    name = u.split("/")[-1].split("?")[0]
    p = ROOT / "assets/diagrams" / name
    print(" ", name, "disk", p.exists(), p.stat().st_size if p.exists() else 0)

print("LIVE SITE assets")
for name in (
    "qx-irodov-a8dbbffe2c4f0c37.png",
    "qx-org-c49221e5dad1f07b.png",
    "qx-self-6a3be4d3a54df4cd.png",
):
    url = "https://www.quantrexacademy.com/assets/diagrams/" + name
    code, ct, cl = get(url)
    disk = ROOT / "assets/diagrams" / name
    print(" ", name, "live", code, cl, "disk", disk.stat().st_size if disk.exists() else 0)

print("LIVE catalog one paper")
cat = "https://www.quantrexacademy.com/api/catalog?action=paper&exam=jee_main&source=" + urllib.request.quote("JEE Main 2026 (06 April Shift 2)") + "&v=qxfix50"
# urllib.request.quote is pathname quote
from urllib.parse import quote
cat = "https://www.quantrexacademy.com/api/catalog?action=paper&exam=jee_main&source=" + quote("JEE Main 2026 (06 April Shift 2)") + "&v=qxfix50"
req = urllib.request.Request(cat, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
        body = r.read()
    j = json.loads(body.decode("utf-8", "ignore"))
    qs = j.get("questions") or j.get("data") or []
    if isinstance(qs, dict):
        qs = qs.get("questions") or []
    print(" catalog http", r.status if False else 200, "n", len(qs) if isinstance(qs, list) else type(qs).__name__, "keys", list(j.keys())[:12])
    if isinstance(qs, list) and qs:
        imgs = []
        for q in qs:
            blob = str(q.get("q") or q.get("questionText") or "") + str(q.get("solution") or "")
            imgs.extend(SRC.findall(blob))
            for o in q.get("options") or []:
                imgs.extend(SRC.findall(o if isinstance(o, str) else str((o or {}).get("text") or "")))
        print(" catalog imgs", len(imgs), "unique", len(set(imgs)))
        for u in list(dict.fromkeys(imgs))[:5]:
            code, ct, cl = get(u)
            print("  catfig", code, cl, u[-70:])
except Exception as e:
    print("catalog fail", e)
