#!/usr/bin/env python3
"""Validate Marks token + sample v4/v1 fetch."""
from __future__ import annotations
import json, ssl, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
cfg = json.loads((ROOT / "data/marks_config.json").read_text(encoding="utf-8"))
TOK = cfg["token"]
CTX = ssl.create_default_context()
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
HDR = {
    "Authorization": "Bearer " + TOK,
    "Accept": "application/json",
    "Origin": "https://web.getmarks.app",
    "Referer": "https://web.getmarks.app/",
    "User-Agent": UA,
}


def get(path):
    req = urllib.request.Request("https://web.getmarks.app" + path, headers=HDR)
    try:
        with urllib.request.urlopen(req, timeout=30, context=CTX) as r:
            body = r.read().decode("utf-8", "ignore")
            return r.status, body[:400]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "ignore")[:400]
    except Exception as e:
        return None, str(e)[:200]


print("email", cfg.get("email"))
for p in (
    "/api/v1/user/me",
    "/api/v4/questions/67efe2fc5c97f0fe143c995c",
    "/api/v1/questions/66bb645f08a93761696e2be9",
):
    code, body = get(p)
    print(p, code, body.replace("\n", " ")[:280])
