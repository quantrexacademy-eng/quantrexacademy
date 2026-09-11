#!/usr/bin/env python3
import json, ssl, urllib.request
from pathlib import Path

cfg = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\marks_config.json").read_text(encoding="utf-8"))
TOK = cfg["token"]
qid = "67efe2fc5c97f0fe143c995c"
req = urllib.request.Request(
    "https://web.getmarks.app/api/v4/questions/" + qid,
    headers={"Authorization": "Bearer " + TOK, "Accept": "application/json", "Origin": "https://web.getmarks.app", "User-Agent": "Mozilla/5.0"},
)
with urllib.request.urlopen(req, timeout=30, context=ssl.create_default_context()) as r:
    j = json.loads(r.read().decode("utf-8"))
q = (j.get("data") or {}).get("question") or (j.get("data") or {})
print("keys", list(q.keys())[:40] if isinstance(q, dict) else type(q))
if isinstance(q, dict):
    for k in ("type", "solution", "answer", "correctIndex", "explanation"):
        v = q.get(k)
        print(k, str(v)[:200] if not isinstance(v, (list, dict)) else type(v).__name__)
    opts = q.get("options") or q.get("question", {}).get("options") if isinstance(q.get("question"), dict) else q.get("options")
    print("options type", type(opts).__name__, "n", len(opts) if isinstance(opts, list) else None)
    if isinstance(opts, list) and opts:
        print("opt0 keys", opts[0].keys() if isinstance(opts[0], dict) else opts[0])
        print("opt0", json.dumps(opts[0])[:400])
    sol = q.get("solution") or {}
    print("sol", json.dumps(sol)[:500] if not isinstance(sol, str) else sol[:400])
    qq = q.get("question")
    if isinstance(qq, dict):
        print("nested question keys", qq.keys())
Path(r"C:\Users\Admin\qx-hosting\data\_migration\marks_pyqmt_probe\v4_sample.json").write_text(json.dumps(j, indent=2)[:8000], encoding="utf-8")
