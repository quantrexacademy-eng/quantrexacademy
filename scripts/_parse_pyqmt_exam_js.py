#!/usr/bin/env python3
import re
from pathlib import Path

p = Path(r"C:\Users\Admin\qx-hosting\data\_migration\marks_pyqmt_probe")
js = next(p.glob("*examId*"))
print("FILE", js, js.stat().st_size)
t = js.read_text(encoding="utf-8", errors="ignore")
print("LEN", len(t))
for pat in [
    r"/api/v[0-9][A-Za-z0-9_\-/{}$.?=]{2,140}",
    r"pyq-mock[^\"']{0,120}",
    r"testId[^,]{0,80}",
    r"questionsCount|questionCount|totalQuestions|nQuestions|duration|totalMarks",
]:
    print("\nPAT", pat)
    found = sorted(set(re.findall(pat, t)))
    for x in found[:40]:
        print(" ", x[:160])

# dump around pyq-mock
idx = 0
c = 0
while True:
    i = t.find("pyq-mock", idx)
    if i < 0:
        break
    print("\nCTX", t[max(0, i-180):i+220].replace("\n", " "))
    idx = i + 8
    c += 1
    if c >= 12:
        break

pretty = t.replace("},{", "},\n{").replace(");", ");\n")
(p / "examId_js.txt").write_text(pretty[:250000], encoding="utf-8")
print("WROTE examId_js.txt", len(pretty))
