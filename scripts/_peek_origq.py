#!/usr/bin/env python3
import json, re, ssl, urllib.request
from pathlib import Path

raw = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json").read_text(encoding="utf-8"))
q = next(x for x in raw["questions"] if x.get("id") == 26811)
print("originalQ", str(q.get("_originalQ") or "")[:800])
print("imgs orig", re.findall(r'src=["\']([^"\']+)["\']', str(q.get("_originalQ") or "")))

cfg = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\marks_config.json").read_text(encoding="utf-8"))
TOK = cfg["token"]
qid = q["_marksId"]
req = urllib.request.Request(
    "https://web.getmarks.app/api/v4/questions/" + qid,
    headers={"Authorization": "Bearer " + TOK, "Accept": "application/json", "Origin": "https://web.getmarks.app", "User-Agent": "Mozilla/5.0"},
)
with urllib.request.urlopen(req, timeout=30, context=ssl.create_default_context()) as r:
    j = json.loads(r.read().decode())
d = (j.get("data") or {}).get("question") or j.get("data") or {}
qq = d.get("question") if isinstance(d, dict) else {}
print("marks q", json.dumps(qq)[:600] if isinstance(qq, dict) else qq)
print("opts0", json.dumps((d.get("options") or [None])[0])[:300])
Path(r"C:\Users\Admin\qx-hosting\data\qid_marks").mkdir(exist_ok=True)
(Path(r"C:\Users\Admin\qx-hosting\data\qid_marks") / f"{qid}.json").write_text(json.dumps(j), encoding="utf-8")
print("cached")
