#!/usr/bin/env python3
import json, ssl, urllib.error, urllib.request
from pathlib import Path
ctx = ssl.create_default_context()
TOK = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\marks_config.json").read_text())["token"]
QID = "67c994b7cc180496584ed224"
paths = [
    f"/api/v1/questions/{QID}",
    f"/api/v4/questions/{QID}",
    f"/api/v4/questions/{QID}/analysis",
    f"/api/v2/questions/{QID}",
    f"/api/v3/questions/{QID}",
]
def get(path):
    url = "https://web.getmarks.app" + path
    req = urllib.request.Request(url, headers={
        "Authorization": "Bearer " + TOK, "Accept": "application/json",
        "User-Agent": "Mozilla/5.0", "Origin": "https://web.getmarks.app",
        "Referer": "https://web.getmarks.app/",
    })
    try:
        with urllib.request.urlopen(req, timeout=40, context=ctx) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {"err": "nojson"}

for p in paths:
    code, body = get(p)
    print("====", code, p)
    if isinstance(body, dict):
        print(" keys", list(body.keys())[:20])
        d = body.get("data") if isinstance(body.get("data"), dict) else body
        if isinstance(d, dict):
            print(" data keys", list(d.keys())[:25])
            opts = d.get("options")
            q = d.get("question") or d.get("title")
            print(" has options", bool(opts), "n", len(opts) if isinstance(opts, list) else None)
            print(" q/title", str(q)[:180])
            if opts:
                print(" opt0", str(opts[0])[:180])
