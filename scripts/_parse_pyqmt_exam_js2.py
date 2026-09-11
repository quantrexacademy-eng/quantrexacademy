#!/usr/bin/env python3
import re
from pathlib import Path

js = Path(r"C:\Users\Admin\qx-hosting\data\_migration\marks_pyqmt_probe\__next_static_chunks_pages_pyq-mt_%5BexamId%5D-b079094025da5388.js")
print("FILE", js.exists(), js.stat().st_size)
t = js.read_text(encoding="utf-8", errors="ignore")
print("LEN", len(t))
for pat in [
    r"/api/v[0-9][A-Za-z0-9_\-/{}$.?=]{2,140}",
    r"pyq-mock[^\"']{0,160}",
]:
    print("\nPAT", pat)
    found = sorted(set(re.findall(pat, t)))
    for x in found[:50]:
        print(" ", x[:200])

idx = 0
c = 0
while True:
    i = t.find("pyq-mock", idx)
    if i < 0:
        break
    print("\nCTX", t[max(0, i-200):i+280].replace("\n", " "))
    idx = i + 8
    c += 1
    if c >= 20:
        break

pretty = t.replace("},{", "},\n{").replace(");", ");\n")
Path(r"C:\Users\Admin\qx-hosting\data\_migration\marks_pyqmt_probe\examId_page_js.txt").write_text(pretty[:300000], encoding="utf-8")
print("WROTE examId_page_js.txt")
