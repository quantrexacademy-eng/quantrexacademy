#!/usr/bin/env python3
import re
import urllib.request
from pathlib import Path

url = "https://web.getmarks.app/_next/static/chunks/pages/marks-selected/exams/%5BexamId%5D/module/%5BmoduleId%5D-5e28005ca620bcb7.js"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
raw = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
out = Path(r"E:\QUANTREX\website\data\_migration\marks_pyq_capture\module.js")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(raw, encoding="utf-8")
print("len", len(raw))
pats = [
    r"https?://[^\"']{0,120}",
    r"/api/v[0-9]/[A-Za-z0-9_\-/{}$]{4,100}",
    r"marks-selected[^\"']{0,90}",
    r"getmarks\.app[^\"']{0,80}",
]
for pat in pats:
    found = sorted(set(re.findall(pat, raw)))
    print("PAT", pat, "n", len(found))
    for f in found[:30]:
        print(" ", f[:200])
