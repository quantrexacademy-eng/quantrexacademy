#!/usr/bin/env python3
import json, ssl, urllib.request
from pathlib import Path
from urllib.parse import urlencode
ctx = ssl.create_default_context()
TOK = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\marks_config.json").read_text())["token"]
exam, mid, sid, cid = (
    "68f1ce4cc729e5251bd00430",
    "68f8d38b834dea3be41f0b19",
    "68f8d38c834dea3be41f0b1c",
    "68f8d38d834dea3be41f0b1d",
)
url = (
    f"https://web.getmarks.app/api/v4/marks-selected/exam/{exam}/module/{mid}"
    f"/subjects/{sid}/chapters/{cid}?{urlencode({'status':'all','offset':0,'limit':5,'platform':'web','isShowAllQs':'true'})}"
)
req = urllib.request.Request(url, headers={
    "Authorization": "Bearer " + TOK, "Accept": "application/json",
    "User-Agent": "Mozilla/5.0", "Origin": "https://web.getmarks.app",
    "Referer": "https://web.getmarks.app/",
})
with urllib.request.urlopen(req, timeout=40, context=ctx) as r:
    body = json.loads(r.read().decode())
Path(r"C:\Users\Admin\qx-hosting\data\_marks_probe\_ms_q_sample.json").write_text(
    json.dumps(body, indent=2, ensure_ascii=False), encoding="utf-8"
)
print("keys", list(body.keys()))
d = body.get("data")
print("data type", type(d).__name__)
if isinstance(d, dict):
    print("data keys", list(d.keys())[:30])
    qs = d.get("questions") or d.get("data") or d.get("docs") or []
    print("qs", len(qs) if isinstance(qs, list) else type(qs))
    if isinstance(qs, list) and qs:
        q0 = qs[0]
        print("q0 keys", list(q0.keys()) if isinstance(q0, dict) else type(q0))
        print(json.dumps(q0, ensure_ascii=False)[:800])
elif isinstance(d, list):
    print("list", len(d))
    if d:
        print("item keys", list(d[0].keys()) if isinstance(d[0], dict) else d[0])
        print(json.dumps(d[0], ensure_ascii=False)[:800])
