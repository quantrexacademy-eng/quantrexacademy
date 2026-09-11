#!/usr/bin/env python3
import json
import ssl
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(r"E:\QUANTREX\website")
OUT = ROOT / "data" / "_migration" / "marks_pyq_capture"
cfg = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = cfg["token"]
CTX = ssl.create_default_context()
BASE = "https://production.getmarks.app"
EXAM = "6a91185f41ab5aba084f4d30"
MOD = "6a916235cb18ffc9d00d5aa1"
SID = "6a916235cb18ffc9d00d5aa4"


def api(path, params=None):
    url = BASE + path
    if params:
        url += ("&" if "?" in url else "?") + urlencode(params)
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": "Bearer " + TOK,
            "Accept": "application/json",
            "Origin": "https://web.getmarks.app",
            "Referer": "https://web.getmarks.app/",
            "User-Agent": "Mozilla/5.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=CTX) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "ignore")[:500]
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw}


paths = [
    f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}/subjects/{SID}/chapters",
    f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}/subjects/{SID}",
    f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}/subject/{SID}/chapters",
    f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}/subjects/{SID}/chapters?platform=web",
]
for p in paths:
    st, b = api(p, {"platform": "web"} if "platform" not in p else None)
    print(st, p)
    print(" ", str(b)[:280].replace("\n", " "))
    if st == 200:
        (OUT / "phy_chapters.json").write_text(json.dumps(b, indent=2, ensure_ascii=False), encoding="utf-8")
        data = b.get("data") or {}
        chs = data.get("chapters") or data.get("data")
        if isinstance(chs, dict):
            chs = chs.get("chapters") or chs.get("data")
        print("  parsed chapters", type(chs), len(chs) if isinstance(chs, list) else chs)
        if isinstance(chs, list) and chs:
            print("  first keys", list(chs[0].keys())[:20])
            print("  first name", chs[0].get("name") or chs[0].get("title"), chs[0].get("_id"))
            cid = chs[0].get("_id") or chs[0].get("id")
            qst, qb = api(
                f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}/subjects/{SID}/chapters/{cid}",
                {"status": "all", "offset": 0, "limit": 3, "platform": "web", "isShowAllQs": "true"},
            )
            print("  qs", qst, str(qb)[:300].replace("\n", " "))
            (OUT / "phy_qsample.json").write_text(json.dumps(qb, indent=2, ensure_ascii=False)[:250000], encoding="utf-8")
        break
