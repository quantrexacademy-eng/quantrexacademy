#!/usr/bin/env python3
import os
import re

root = r"C:\Users\Admin\getmarks_js"
rx = re.compile(r".{0,90}(/api/v[0-9]/[A-Za-z0-9_\-/{}$?]{4,120}).{0,90}")
for n in os.listdir(root):
    if not n.endswith(".js"):
        continue
    t = open(os.path.join(root, n), encoding="utf-8", errors="ignore").read()
    if "marks-selected" not in t and "/api/v4/questions" not in t and "question-poll" not in t:
        continue
    print("FILE", n, "len", len(t))
    shown = 0
    for m in rx.finditer(t):
        s = m.group(0)
        if any(k in s for k in ("marks-selected", "/questions", "question-poll", "chapter")):
            print(" ", s.replace("\n", " ")[:240])
            shown += 1
            if shown >= 30:
                break
