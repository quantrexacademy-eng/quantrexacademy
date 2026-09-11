#!/usr/bin/env python3
"""Login-check Marks token and find working full-question + PYQ chapter APIs."""
from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(r"E:\QUANTREX\website")
TOK = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))["token"]
CTX = ssl.create_default_context()
HDR = {
    "Authorization": "Bearer " + TOK,
    "Accept": "application/json",
    "Origin": "https://web.getmarks.app",
    "Referer": "https://web.getmarks.app/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}
EXAM = "6a91185f41ab5aba084f4d30"
MOD = "6a916235cb18ffc9d00d5aa1"
# known classic id from USB 37393
CLASSIC = "67a2eed5c8b73881fdaea345"
# known qid_marks sample
QIDDIR = ROOT / "data" / "qid_marks"
SAMPLE = ""
if QIDDIR.exists():
    for p in QIDDIR.iterdir():
        if p.suffix == ".json" and p.stat().st_size > 500:
            SAMPLE = p.stem
            break


def get(base, path, params=None):
    url = base.rstrip("/") + path
    if params:
        url += ("&" if "?" in path else "?") + urlencode(params)
    req = urllib.request.Request(url, headers=HDR)
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            raw = r.read().decode("utf-8", "ignore")
            try:
                body = json.loads(raw)
            except Exception:
                body = {"raw": raw[:200]}
            return r.status, body
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "ignore")[:300]
        try:
            body = json.loads(raw)
        except Exception:
            body = {"raw": raw}
        return e.code, body
    except Exception as e:
        return 0, {"err": str(e)[:160]}


def brief(body):
    if not isinstance(body, dict):
        return str(body)[:160]
    d = body.get("data") if isinstance(body.get("data"), dict) else body
    keys = list(d.keys())[:10] if isinstance(d, dict) else []
    opts = d.get("options") if isinstance(d, dict) else None
    q = d.get("question") if isinstance(d, dict) else None
    img = None
    if isinstance(q, dict):
        img = q.get("image")
        q = q.get("text") or q.get("html")
    return f"keys={keys} opts={len(opts) if isinstance(opts, list) else None} q={str(q)[:60]!r} img={bool(img)} msg={body.get('message') or body.get('error') or ''}"


print("sample_qid", SAMPLE)
for base in ("https://web.getmarks.app", "https://production.getmarks.app"):
    print("\n====", base)
    for path, params in [
        ("/api/v1/user/me", None),
        ("/api/v4/user/me", None),
        (f"/api/v1/questions/{CLASSIC}", {"platform": "web"}),
        (f"/api/v4/questions/{CLASSIC}", {"platform": "web"}),
        (f"/api/v1/questions/{SAMPLE}", {"platform": "web"}) if SAMPLE else (None, None),
        (f"/api/v4/questions/{SAMPLE}", {"platform": "web"}) if SAMPLE else (None, None),
        (f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}", {"platform": "web"}),
        (f"/api/v4/marks-selected/dashboard", {"platform": "web"}),
    ]:
        if not path:
            continue
        st, body = get(base, path, params)
        print(st, path[:90], brief(body)[:220])
