#!/usr/bin/env python3
"""Switch Marks account to Medical, extract Zoo/Bot/Phy/Chem RFC, restore Engineering."""
from __future__ import annotations

import json
import ssl
import urllib.request
from pathlib import Path

import _extract_rfc as base

ROOT = Path(r"C:\Users\Admin\qx-hosting")
TOKEN = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))["token"]
CTX = ssl.create_default_context()
API = "https://web.getmarks.app"
ENG = "615d3e0cc52ffa3c944600db"
MED = "615d3e29c52ffa3c944600dc"

MED_SUBJECTS = [
    {"id": "6a7c67364a29d63ee45d4d54", "name": "Physics", "count": 613, "tracks": ["Medical"], "key": "physics_med"},
    {"id": "6a7c67374a29d63ee45d4d56", "name": "Chemistry", "count": 1201, "tracks": ["Medical"], "key": "chemistry_med"},
    {"id": "6a7c67374a29d63ee45d4d58", "name": "Zoology", "count": 673, "tracks": ["Medical"], "key": "zoology"},
    {"id": "6a7c67374a29d63ee45d4d59", "name": "Botany", "count": 471, "tracks": ["Medical"], "key": "botany"},
]


def req(method, path, body=None):
    data = None
    h = {
        "Accept": "application/json",
        "Authorization": "Bearer " + TOKEN,
        "User-Agent": "Mozilla/5.0",
        "Origin": API,
        "Referer": API + "/",
    }
    if body is not None:
        data = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    r = urllib.request.Request(API + path, data=data, headers=h, method=method)
    with urllib.request.urlopen(r, context=CTX, timeout=40) as resp:
        return json.loads(resp.read().decode())


def main():
    print("PATCH medical", flush=True)
    print(req("PATCH", "/api/v1/user/examCategory", {"examCategory": MED}).get("message"))
    extracted = []
    try:
        for sub in MED_SUBJECTS:
            res = base.extract_subject(sub)
            if res:
                extracted.append(res[0])
    finally:
        print("PATCH engineering", flush=True)
        print(req("PATCH", "/api/v1/user/examCategory", {"examCategory": ENG}).get("message"))

    nav_path = ROOT / "data" / "nav" / "rfc.json"
    nav = json.loads(nav_path.read_text(encoding="utf-8")) if nav_path.exists() else []
    by_id = {s.get("id"): s for s in nav}
    for pack in extracted:
        by_id[pack["id"]] = {
            "id": pack["id"],
            "name": pack["name"],
            "count": pack["count"],
            "tracks": pack["tracks"],
            "image": pack.get("image"),
            "key": pack.get("id") and next((s["key"] for s in MED_SUBJECTS if s["id"] == pack["id"]), None),
            "chapters": pack["chapters"],
        }
    # restore keys on engineering too
    for s in nav:
        if s.get("id") in by_id and not by_id[s["id"]].get("key"):
            pass
    merged = list(by_id.values())
    # stable order
    order = ["6a7c67364a29d63ee45d4d53", "6a7c67374a29d63ee45d4d55", "6a7c67374a29d63ee45d4d57",
             "6a7c67364a29d63ee45d4d54", "6a7c67374a29d63ee45d4d56", "6a7c67374a29d63ee45d4d58", "6a7c67374a29d63ee45d4d59"]
    merged.sort(key=lambda s: order.index(s["id"]) if s.get("id") in order else 99)
    nav_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    idx = json.loads((ROOT / "data" / "rfc_offline" / "index.json").read_text(encoding="utf-8"))
    idx["subjects"] = merged
    (ROOT / "data" / "rfc_offline" / "index.json").write_text(json.dumps(idx, ensure_ascii=False), encoding="utf-8")
    print("merged nav", [(s.get("name"), s.get("tracks"), s.get("count")) for s in merged])


if __name__ == "__main__":
    main()
