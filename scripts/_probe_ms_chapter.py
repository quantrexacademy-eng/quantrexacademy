#!/usr/bin/env python3
"""Probe Marks Selected chapter/question endpoints for Rank Booster + HCV."""
import json
import ssl
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlencode

ctx = ssl.create_default_context()
cfg = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\marks_config.json").read_text(encoding="utf-8"))
TOK = cfg["token"]

# Rank booster first chapter
CH = {
    "book": "68f1ce4cc729e5251bd00430",
    "mod": "68f8d38b834dea3be41f0b19",
    "sub": "68f8d38c834dea3be41f0b1c",
    "ch": "68f8d38d834dea3be41f0b1d",
}

paths = [
    f"/api/v4/marks-selected/chapter/{CH['ch']}/questions",
    f"/api/v4/marks-selected/chapters/{CH['ch']}/questions",
    f"/api/v4/marks-selected/chapter/{CH['ch']}",
    f"/api/v4/marks-selected/module/{CH['mod']}/subject/{CH['sub']}/chapter/{CH['ch']}/questions",
    f"/api/v4/marks-selected/module/{CH['mod']}/subject/{CH['sub']}/chapter/{CH['ch']}",
    f"/api/v4/marks-selected/module/{CH['mod']}/subject/{CH['sub']}/chapters/{CH['ch']}/questions",
    f"/api/v4/marks-selected/exam/{CH['book']}/chapter/{CH['ch']}/questions",
    f"/api/v4/marks-selected/exam/{CH['book']}/module/{CH['mod']}/subject/{CH['sub']}/chapter/{CH['ch']}/questions",
    f"/api/v3/marks-selected/chapter/{CH['ch']}/questions",
    f"/api/v4/ms/chapter/{CH['ch']}/questions",
    f"/api/v4/marks-selected/questions?chapterId={CH['ch']}",
]


def get(path):
    url = "https://web.getmarks.app" + path
    if "isShowAllQs" not in url:
        url += ("&" if "?" in url else "?") + "isShowAllQs=true&platform=web&limit=20&offset=0"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": "Bearer " + TOK,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Origin": "https://web.getmarks.app",
            "Referer": "https://web.getmarks.app/",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40, context=ctx) as r:
            body = r.read().decode("utf-8", "replace")
            return r.status, body[:500]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")[:300]
    except Exception as e:
        return 0, str(e)[:200]


# token check
print("DASH", get("/api/v4/marks-selected/dashboard")[0])
for p in paths:
    code, snip = get(p)
    print(code, p)
    if code == 200:
        print("  ", snip[:280].replace("\n", " "))
