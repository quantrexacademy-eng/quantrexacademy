#!/usr/bin/env python3
import json, ssl, urllib.error, urllib.request
from pathlib import Path
CTX = ssl.create_default_context()
TOK = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\marks_config.json").read_text())["token"]
QID = "67c995c0cc180496584edf86"
# olympiad numerical
QID2 = "69075c9649e6141a77a592c7"

def get(path, method="GET", data=None):
    url = "https://web.getmarks.app" + path
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method, headers={
        "Authorization": "Bearer " + TOK, "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0", "Origin": "https://web.getmarks.app",
        "Referer": "https://web.getmarks.app/",
    })
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {"err": e.read().decode("utf-8","replace")[:200]}

# load masterId
raw = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\qid_marks") / f"{QID}.json")
d = raw.get("data") or {}
print("masterId", d.get("masterId"))
paths = [
    f"/api/v1/questions/{QID}?platform=web&isShowAllQs=true",
    f"/api/v4/questions/{QID}?platform=web",
    f"/api/v1/questions/{d.get('masterId')}" if d.get("masterId") else None,
    f"/api/v4/questions/{QID}/analysis",
    f"/api/v1/questions/{QID}/analysis",
    f"/api/v1/questions/{QID}/solution",
    f"/api/v3/questions/{QID}",
]
for p in paths:
    if not p: continue
    code, body = get(p)
    dd = body.get("data") if isinstance(body, dict) else None
    opts = (dd or {}).get("options") if isinstance(dd, dict) else None
    print(code, p[:90], "opts", len(opts) if isinstance(opts, list) else None, "keys", list((dd or body or {}).keys())[:8] if isinstance(dd or body, dict) else "")

# try start/attempt
for p, method, payload in [
    (f"/api/v1/questions/{QID}/start", "POST", {}),
    (f"/api/v4/questions/{QID}/start", "POST", {}),
    (f"/api/v1/practice/questions/{QID}", "GET", None),
    (f"/api/v4/practice/question/{QID}", "GET", None),
]:
    code, body = get(p, method, payload)
    print("TRY", method, code, p, str(body)[:160].replace("\n"," "))
