#!/usr/bin/env python3
import json, ssl, urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
cfg = json.loads((ROOT/"data/marks_config.json").read_text(encoding="utf-8"))
TOK = cfg["token"]
rep = json.loads((ROOT/"data/_migration/neet_pyqmt_apply.json").read_text(encoding="utf-8"))
# load some added ids from bank
bank = json.loads((ROOT/"data/banks/neet.json").read_text(encoding="utf-8"))
qs = [q for q in bank["questions"] if q.get("_from") == "marks_pyqmt"]
print("added", len(qs))
sample = qs[:4]
CTX = ssl.create_default_context()

def get(path):
    req = urllib.request.Request(
        "https://web.getmarks.app" + path,
        headers={
            "Authorization": "Bearer " + TOK,
            "Accept": "application/json",
            "Origin": "https://web.getmarks.app",
            "User-Agent": "Mozilla/5.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=CTX) as r:
            return r.status, r.read()[:400]
    except urllib.error.HTTPError as e:
        return e.code, e.read()[:200]

import urllib.error
for q in sample:
    print("Q", q.get("id"), q.get("source"), (q.get("q") or "")[:60])
    for p in [
        f"/api/v1/questions/{q['id']}",
        f"/api/v4/questions/{q['id']}",
        f"/api/v1/questions/{q.get('_marksId')}",
    ]:
        st, body = get(p)
        print(" ", st, p, body[:160])
# fig urls
nfig = 0
cdn = set()
import re
for q in qs:
    blob = str(q.get("q") or "") + " " + " ".join(str(o) for o in (q.get("options") or []))
    for u in re.findall(r'https?://[^\"\'\s>]+', blob):
        cdn.add(u)
        nfig += 1
print("cdn unique", len(cdn), "hits", nfig)
for u in list(cdn)[:8]:
    print(" ", u[:120])
