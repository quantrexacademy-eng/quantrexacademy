#!/usr/bin/env python3
"""Remove dead /assets/ img tags when another live image remains. Never invents."""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
IMG = re.compile(r"<img[^>]*>", re.I)
SRC = re.compile(r'src=["\']([^"\']+)["\']', re.I)
BANKS = [
    "ap_eamcet", "ts_eamcet", "neet", "jee_advanced", "kcet", "kvpy",
    "mht_cet", "nta_abhyas_jee_main", "viteee", "wbjee", "jee_main",
]


def live(src):
    path = src.split("?")[0]
    if path.startswith("/assets/"):
        return (ROOT / path.lstrip("/")).is_file()
    if src.startswith("http") or src.startswith("data:"):
        return True
    return False


def clean(s):
    if not isinstance(s, str) or "<img" not in s.lower():
        return s
    tags = list(IMG.finditer(s))
    if not tags:
        return s
    keep = []
    dead = []
    for m in tags:
        sm = SRC.search(m.group(0))
        src = sm.group(1) if sm else ""
        if live(src):
            keep.append(m)
        else:
            dead.append(m)
    if not dead:
        return s
    if not keep:
        return s  # do not wipe the only figures
    out = s
    for m in reversed(dead):
        out = out[:m.start()] + out[m.end():]
    return out


n = 0
for slug in BANKS:
    p = ROOT / "data" / "banks" / f"{slug}.json"
    if not p.exists():
        continue
    data = json.loads(p.read_text(encoding="utf-8"))
    qs = data.get("questions") or []
    ch = 0
    for q in qs:
        if not isinstance(q, dict):
            continue
        dirty = False
        for f in ("q", "question", "solution", "explanation"):
            raw = q.get(f)
            new = clean(raw) if isinstance(raw, str) else raw
            if new != raw:
                q[f] = new
                dirty = True
        opts = q.get("options")
        if isinstance(opts, list):
            nopts, och = [], False
            for o in opts:
                if isinstance(o, str):
                    no = clean(o)
                    nopts.append(no)
                    och = och or no != o
                elif isinstance(o, dict):
                    o2 = dict(o)
                    for k in ("text", "html"):
                        if isinstance(o2.get(k), str):
                            nv = clean(o2[k])
                            if nv != o2[k]:
                                o2[k] = nv
                                och = True
                    nopts.append(o2)
                else:
                    nopts.append(o)
            if och:
                q["options"] = nopts
                dirty = True
        if dirty:
            ch += 1
    if ch:
        p.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        n += ch
        print(slug, "stripped", ch)
print("total", n)
