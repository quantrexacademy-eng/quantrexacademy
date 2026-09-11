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
        raw = e.read().decode("utf-8", "ignore")[:800]
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw}


st, body = api(f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}/subjects", {"platform": "web"})
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "subjects.json").write_text(json.dumps(body, indent=2, ensure_ascii=False), encoding="utf-8")
print("subjects", st)
data = body.get("data") or {}
mod = data.get("module") or {}
subs = data.get("subjects") or mod.get("subjects") or data.get("data") or []
if isinstance(data, list):
    subs = data
print("module keys", list(mod.keys())[:20] if isinstance(mod, dict) else type(mod))
print("data keys", list(data.keys())[:30] if isinstance(data, dict) else type(data))
print("nsubj", len(subs) if isinstance(subs, list) else type(subs))
if isinstance(subs, list):
    for s in subs:
        sid = s.get("_id") or s.get("id")
        name = s.get("name") or s.get("title") or ((s.get("titles") or [""])[0] if isinstance(s.get("titles"), list) else "")
        print(" SUBJ", name, sid, "keys", list(s.keys())[:18], "ch", len(s.get("chapters") or []))
        chs = s.get("chapters")
        if not chs:
            for p in (
                f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}/subjects/{sid}/chapters",
                f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}/subject/{sid}/chapters",
                f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}/subjects/{sid}",
            ):
                c, b = api(p, {"platform": "web"})
                print("  try", c, p, str(b)[:180].replace("\n", " "))
                if c == 200:
                    (OUT / f"ch_{sid}.json").write_text(json.dumps(b, indent=2, ensure_ascii=False), encoding="utf-8")
                    bd = b.get("data") or {}
                    chs = bd.get("chapters") or bd.get("data") or (b.get("chapters") if isinstance(b.get("chapters"), list) else [])
                    if isinstance(chs, list) and chs:
                        print("  chapters", len(chs), "first", (chs[0].get("name") or chs[0].get("title") or chs[0].get("_id")))
                        cid = chs[0].get("_id") or chs[0].get("id")
                        qst, qb = api(
                            f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}/subjects/{sid}/chapters/{cid}",
                            {"status": "all", "offset": 0, "limit": 5, "platform": "web", "isShowAllQs": "true"},
                        )
                        print("  qs", qst, str(qb)[:240].replace("\n", " "))
                        (OUT / f"qsample_{cid}.json").write_text(json.dumps(qb, indent=2, ensure_ascii=False)[:200000], encoding="utf-8")
                    break
        else:
            print("  inline chapters", len(chs))
