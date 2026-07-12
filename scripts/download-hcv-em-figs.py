import json
import re
import urllib.request
from pathlib import Path

CHAPTER = Path(
    r"E:\quantrexacademy\data\books\chapters\6a0addba4b032b031e049a36"
    r"\6a0addba4b032b031e049a36__6a2fdc56afb6d6932c18272b__"
    r"6a2fdc56afb6d6932c18272e__6a2fdc56afb6d6932c183850.json"
)
OUT = Path(r"E:\quantrexacademy\assets\diagrams\hcv-em-induction-src")
OUT.mkdir(parents=True, exist_ok=True)

with CHAPTER.open(encoding="utf-8") as f:
    data = json.load(f)

seen = set()
for q in data.get("questions", []):
    text = (q.get("q") or "") + (q.get("solution") or "")
    for src in re.findall(r'src=["\']([^"\']+)["\']', text):
        if not src.startswith("http"):
            continue
        if src in seen:
            continue
        seen.add(src)
        name = src.rsplit("/", 1)[-1]
        dest = OUT / name
        if dest.exists():
            continue
        try:
            urllib.request.urlretrieve(src, dest)
            print("ok", name)
        except Exception as e:
            print("fail", name, e)

print("total", len(seen))