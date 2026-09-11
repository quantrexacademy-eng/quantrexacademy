#!/usr/bin/env python3
import json
from pathlib import Path
import urllib.request
import ssl

ROOT = Path(r"E:\QUANTREX\website")
tok = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))["token"]
qid = "67a2eed5c8b73881fdaea345"
url = "https://web.getmarks.app/api/v1/questions/" + qid
req = urllib.request.Request(url, headers={
    "Authorization": "Bearer " + tok,
    "Accept": "application/json",
    "Origin": "https://web.getmarks.app",
    "Referer": "https://web.getmarks.app/",
    "User-Agent": "Mozilla/5.0",
})
ctx = ssl.create_default_context()
try:
    with urllib.request.urlopen(req, timeout=40, context=ctx) as r:
        raw = r.read().decode("utf-8", "ignore")
        print("status", r.status, "len", len(raw))
        j = json.loads(raw)
except Exception as e:
    print("ERR", type(e).__name__, e)
    raise SystemExit(1)
out = ROOT / "data" / "qid_marks" / (qid + ".json")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(j), encoding="utf-8")
print("saved", out)
d = j.get("data") if isinstance(j.get("data"), dict) else j
print("top", list(j.keys())[:12] if isinstance(j, dict) else type(j))
if isinstance(d, dict):
    print("data keys", list(d.keys())[:20])
    q = d.get("question") or {}
    if isinstance(q, dict):
        print("stem", str(q.get("text") or q.get("html") or "")[:240])
    opts = d.get("options") or []
    print("nopts", len(opts))
    for i, o in enumerate(opts[:4]):
        if isinstance(o, dict):
            print(" opt", i, "correct", o.get("isCorrect"), str(o.get("text") or "")[:80])
        else:
            print(" opt", i, str(o)[:80])
    sol = d.get("solution") or {}
    if isinstance(sol, dict):
        print("sol", str(sol.get("text") or sol.get("html") or "")[:500])
        print("sol img", sol.get("image"))
    print("type", d.get("type"), "cv", d.get("correctValue"))
