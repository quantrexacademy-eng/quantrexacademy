#!/usr/bin/env python3
"""Find JEE Main questions whose options are 23,18,15,14."""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
TARGETS = [
    ROOT / "data" / "banks" / "jee_main.json",
    ROOT / "data" / "tests",
]


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def qs_of(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    return []


def opt_plain(o):
    if isinstance(o, str):
        return strip(o)
    if isinstance(o, dict):
        return strip(o.get("text") or o.get("html") or "")
    return strip(o)


def match_opts(opts):
    plains = [opt_plain(o) for o in (opts or [])]
    if plains == ["23", "18", "15", "14"]:
        return True
    if set(plains) == {"23", "18", "15", "14"} and len(plains) == 4:
        return True
    return False


hits = []
for area in TARGETS:
    files = [area] if area.is_file() else area.rglob("*.json")
    for fp in files:
        if fp.name.startswith("_") or ".bak" in fp.name:
            continue
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        qs = qs_of(data)
        if not qs:
            continue
        for i, q in enumerate(qs):
            if not isinstance(q, dict):
                continue
            if match_opts(q.get("options")):
                hits.append({
                    "file": str(fp.relative_to(ROOT)),
                    "idx": i,
                    "id": q.get("id"),
                    "source": q.get("source"),
                    "chapter": q.get("chapter"),
                    "subject": q.get("subject"),
                    "q": strip(q.get("q") or q.get("question") or "")[:300],
                    "qraw_len": len(str(q.get("q") or "")),
                    "has_img": "<img" in str(q.get("q") or "").lower(),
                })
                if len(hits) >= 20:
                    print(json.dumps(hits, indent=2, ensure_ascii=False))
                    raise SystemExit
print("n", len(hits))
print(json.dumps(hits, indent=2, ensure_ascii=False))
