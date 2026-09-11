#!/usr/bin/env python3
import json
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(r"E:\QUANTREX\website")
cfg = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = cfg["token"]
CTX = ssl.create_default_context()
QID = "6a7a1ff802394af5b64470ec"
for path in (
    f"https://production.getmarks.app/api/v1/questions/{QID}",
    f"https://production.getmarks.app/api/v4/questions/{QID}",
    f"https://production.getmarks.app/api/v1/questions/{QID}?platform=web",
):
    req = urllib.request.Request(
        path,
        headers={
            "Authorization": "Bearer " + TOK,
            "Accept": "application/json",
            "Origin": "https://web.getmarks.app",
            "Referer": "https://web.getmarks.app/",
            "User-Agent": "Mozilla/5.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            raw = r.read().decode("utf-8")
            print("OK", r.status, path, "len", len(raw))
            j = json.loads(raw)
            (ROOT / "data/_migration/marks_pyq_capture/oneq.json").write_text(
                json.dumps(j, indent=2, ensure_ascii=False)[:200000], encoding="utf-8"
            )
            d = j.get("data") or j
            print("keys", list(d.keys())[:25] if isinstance(d, dict) else type(d))
            if isinstance(d, dict):
                print("q", str((d.get("question") or d.get("title") or ""))[:160])
                print("opts", type(d.get("options")), "n", len(d.get("options") or []))
                print("sol", str(d.get("solution") or "")[:80])
            break
    except Exception as e:
        print("FAIL", path, e)
