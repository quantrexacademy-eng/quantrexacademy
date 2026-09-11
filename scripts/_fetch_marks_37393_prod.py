#!/usr/bin/env python3
import json, ssl, urllib.request
from pathlib import Path
ROOT = Path(r"E:\QUANTREX\website")
TOK = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))["token"]
qid = "67a2eed5c8b73881fdaea345"
url = "https://production.getmarks.app/api/v1/questions/" + qid
req = urllib.request.Request(url, headers={
    "Authorization": "Bearer " + TOK,
    "Accept": "application/json",
    "Origin": "https://web.getmarks.app",
    "Referer": "https://web.getmarks.app/",
    "User-Agent": "Mozilla/5.0",
})
ctx = ssl.create_default_context()
with urllib.request.urlopen(req, timeout=40, context=ctx) as r:
    raw = r.read().decode("utf-8", "ignore")
j = json.loads(raw)
out = ROOT / "data" / "qid_marks" / (qid + ".json")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(j), encoding="utf-8")
print("saved", out, "bytes", out.stat().st_size)
d = j.get("data") if isinstance(j.get("data"), dict) else j
print("keys", list(d.keys())[:25])
q = d.get("question") or {}
if isinstance(q, dict):
    print("stem", str(q.get("text") or "")[:180])
    print("qimg", q.get("image"))
opts = d.get("options") or []
print("nopts", len(opts))
for i, o in enumerate(opts[:4]):
    if isinstance(o, dict):
        print(" opt", i, "corr", o.get("isCorrect"), "img", bool(o.get("image")), str(o.get("text") or "")[:80])
sol = d.get("solution") or {}
if isinstance(sol, dict):
    print("sol_text", str(sol.get("text") or sol.get("html") or "")[:500])
    print("sol_img", sol.get("image"))
print("type", d.get("type"), "level", d.get("level"))
