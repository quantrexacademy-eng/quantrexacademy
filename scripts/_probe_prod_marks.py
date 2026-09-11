#!/usr/bin/env python3
import json
import ssl
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(r"E:\QUANTREX\website")
cfg = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = cfg["token"]
CTX = ssl.create_default_context()
EXAM = "6a91185f41ab5aba084f4d30"
MOD = "6a916235cb18ffc9d00d5aa1"
BASES = [
    "https://production.getmarks.app",
    "https://web.getmarks.app",
]
PATHS = [
    "/api/v4/marks-selected/dashboard",
    f"/api/v4/marks-selected/exam/{EXAM}",
    f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}",
    f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}/subjects",
    f"/api/v4/marks-selected/module/{MOD}",
    f"/api/v4/marks-selected/module/{MOD}/subjects",
]


def get(base, path):
    url = base + path + "?" + urlencode({"platform": "web"})
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": "Bearer " + TOK,
            "Accept": "application/json",
            "Origin": "https://web.getmarks.app",
            "Referer": "https://web.getmarks.app/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            raw = r.read().decode("utf-8", "ignore")
            return r.status, raw
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "ignore")[:500]
    except Exception as e:
        return None, str(e)[:200]


for base in BASES:
    print("\n====", base)
    for p in PATHS:
        st, raw = get(base, p)
        print(st, p, (raw[:280].replace("\n", " ") if raw else ""))
