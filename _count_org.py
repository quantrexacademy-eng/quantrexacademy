import re
from pathlib import Path

p = Path(r"C:\Users\Admin\qx-hosting\data\books\chapters\6a4ce383c59a7b462185330f")
rx = re.compile(r"src=[\"']([^\"']+)[\"']")
qz = loc = 0
for f in p.glob("*.json"):
    t = f.read_text(encoding="utf-8")
    for s in rx.findall(t):
        if "quizrr" in s:
            qz += 1
        if "qx-org-" in s:
            loc += 1
print("local", loc, "quizrr", qz)
