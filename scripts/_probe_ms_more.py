#!/usr/bin/env python3
import json, ssl, urllib.error, urllib.request
from pathlib import Path
ctx = ssl.create_default_context()
TOK = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\marks_config.json").read_text())["token"]
mid, sid, cid = "68f8d38b834dea3be41f0b19", "68f8d38c834dea3be41f0b1c", "68f8d38d834dea3be41f0b1d"
gsid = "615d70bd9948bc1b21da2b1f"
paths = [
    f"/api/v4/marks-selected/module/{mid}/subject/{sid}",
    f"/api/v4/marks-selected/module/{mid}/subject/{sid}/chapters",
    f"/api/v4/marks-selected/subject/{sid}",
    f"/api/v4/marks-selected/subject/{sid}/chapters",
    f"/api/v4/marks-selected/subject/{sid}/chapter/{cid}",
    f"/api/v4/marks-selected/subject/{sid}/chapter/{cid}/questions",
    f"/api/v4/marks-selected/module/{mid}/chapters",
    f"/api/v3/cpyqb/chapters/{cid}/questions",
    f"/api/v4/cpyqb/chapter/{cid}/questions",
    f"/api/v4/cpyqb/exam/615d76cfc52ffa3c944600e0/subject/{gsid}/chapter/{cid}/questions?platform=web",
    f"/api/v4/marks-selected/module/{mid}/subject/{sid}/questions",
    f"/api/v2/ms/chapter/{cid}/questions",
    f"/api/v1/ms/chapter/{cid}/questions",
    f"/api/v4/content/chapter/{cid}/questions",
]

def get(path):
    url = "https://web.getmarks.app" + path
    if "?" not in url:
        url += "?platform=web&isShowAllQs=true&limit=5&offset=0"
    req = urllib.request.Request(url, headers={
        "Authorization": "Bearer " + TOK, "Accept": "application/json",
        "User-Agent": "Mozilla/5.0", "Origin": "https://web.getmarks.app",
        "Referer": "https://web.getmarks.app/",
    })
    try:
        with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
            b = r.read().decode("utf-8", "replace")
            return r.status, b[:400]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")[:220]
    except Exception as e:
        return 0, str(e)[:160]

for p in paths:
    c, s = get(p)
    print(c, p[:110])
    if c == 200:
        print(" ", s.replace("\n", " ")[:300])
