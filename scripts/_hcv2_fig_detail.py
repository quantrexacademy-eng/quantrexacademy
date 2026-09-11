#!/usr/bin/env python3
from pathlib import Path
import json, re
ROOT = Path(r"C:\Users\Admin\qx-hosting")
d = ROOT / "data/books/chapters/6a0addba4b032b031e049a36"
SRC = re.compile(r"""<img\b[^>]*src\s*=\s*['\"]([^'\"]+)['\"]""", re.I)
nQ = nImgQ = nImgOpt = nImgSol = 0
samples = []
missing = []
for fp in sorted(d.glob("*.json")):
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        continue
    qs = data.get("questions") if isinstance(data, dict) else data
    if not isinstance(qs, list):
        continue
    for q in qs:
        nQ += 1
        rawq = str(q.get("q") or q.get("question") or "")
        opts = q.get("options") or []
        sol = str(q.get("solution") or "")
        uq = SRC.findall(rawq)
        uo = []
        for o in opts:
            uo += SRC.findall(str(o))
        us = SRC.findall(sol)
        if uq: nImgQ += 1
        if uo: nImgOpt += 1
        if us: nImgSol += 1
        for u in uq + uo + us:
            rel = u.replace("\\/", "/").split("?")[0].lstrip("/")
            p = ROOT / rel if rel.startswith("assets/") else None
            if p and (not p.exists() or p.stat().st_size < 80):
                missing.append((fp.name[-40:], u[:90]))
            elif len(samples) < 6 and uq:
                samples.append({"ch": data.get("chapter") if isinstance(data, dict) else "", "id": q.get("id"), "url": u[:110], "exists": bool(p and p.exists())})
print("qs", nQ, "stemFig", nImgQ, "optFig", nImgOpt, "solFig", nImgSol, "missingFiles", len(missing))
for s in samples:
    print(" sample", s)
for m in missing[:8]:
    print(" MISS", m)
# nav keys vs files
nav = json.loads((ROOT/"data/nav/books/6a0addba4b032b031e049a36.json").read_text(encoding="utf-8"))
keys = []
for mod in nav.get("modules") or []:
    for sub in mod.get("subjects") or []:
        for ch in sub.get("chapters") or []:
            keys.append(ch.get("key"))
            for ex in ch.get("exercises") or []:
                keys.append(ex.get("key"))
disk = {p.stem for p in d.glob("*.json")}
navset = {k for k in keys if k}
print("navKeys", len(navset), "disk", len(disk), "navMissingOnDisk", len(navset-disk), "diskNotInNav", len(disk-navset))
print("missingOnDisk sample", list(navset-disk)[:8])
print("alias medical nav exists", (ROOT/"data/nav/books/6a0adb714b032b031e049a34.json").exists())
