#!/usr/bin/env python3
import json
import re
from pathlib import Path

OUT = Path(r"C:\Users\Admin\qx-hosting\data\_migration\marks_pyqmt_probe")
js = next(OUT.glob("*pyq-mt*.js"))
print("FILE", js, js.stat().st_size)
t = js.read_text(encoding="utf-8", errors="ignore")
print("LEN", len(t))
apis = sorted(set(re.findall(r"/api/v[0-9][A-Za-z0-9_\-/{}$.?=]{2,140}", t)))
print("APIS", len(apis))
for a in apis:
    print(" ", a)
# string literals
strs = sorted(set(re.findall(r"['\"](/[A-Za-z0-9_\-/{}$?.=]{3,120})['\"]", t)))
print("PATHS", len(strs))
for a in strs:
    print(" ", a)
# also dump concat-style endpoints
for m in re.finditer(r"get\([\"']/[^\"']+[\"']", t):
    print("GET", m.group(0)[:160])
for m in re.finditer(r"\.get\([^\)]{5,200}\)", t):
    print("GETCALL", m.group(0)[:220])
# write pretty-ish split
(OUT / "pyqmt_js.txt").write_text(t.replace("},{", "},\n{").replace(");", ");\n")[:200000], encoding="utf-8")
print("WROTE pyqmt_js.txt")
