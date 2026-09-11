#!/usr/bin/env python3
import json, re
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")

def norm(s):
    t = re.sub(r"<[^>]+>", " ", str(s or ""))
    t = re.sub(r"\\mathrm\{([A-Za-z])\}", r"\1", t)
    t = re.sub(r"[^a-z0-9]+", " ", t.lower())
    return re.sub(r"\s+", " ", t).strip()[:140]

bank = json.loads((ROOT / "data/banks/neet.json").read_text(encoding="utf-8"))["questions"]
idx = {}
for q in bank:
    k = norm(q.get("q") or "")
    if len(k) >= 24:
        idx.setdefault(k, []).append(q)

def match_paper(fp, label):
    j = json.loads(fp.read_text(encoding="utf-8"))
    td = j["data"]["testData"]
    hit = miss = 0
    img = 0
    for sec in td.get("sections") or []:
        for q in sec.get("questions") or []:
            qq = q.get("question") or {}
            if qq.get("image") or any(isinstance(o, dict) and o.get("image") for o in (q.get("options") or [])):
                img += 1
            text = qq.get("text") or ""
            if "<img" in text.lower():
                img += 1
            k = norm(text)
            if k in idx:
                hit += 1
            else:
                # prefix
                found = False
                if len(k) >= 40:
                    pre = k[:40]
                    for kk in idx:
                        if kk.startswith(pre) or pre.startswith(kk[:40]):
                            found = True
                            break
                if found:
                    hit += 1
                else:
                    miss += 1
    print(label, "n", td.get("totalQuestions"), "hit", hit, "miss", miss, "img", img, "time", td.get("totalTime"))

papers = ROOT / "data/_migration/marks_pyqmt_probe/papers"
match_paper(papers / "neet_2025_682f09e63c12124fd1b20ddd.json", "NEET2025")
match_paper(papers / "neet_2002_67efe2de5c97f0fe143c9913.json", "NEET2002")
match_paper(papers / "neet_2021_67efd9e85c97f0fe143c83cd.json", "NEET2021")
match_paper(papers / "reneet_2026_6a0e2790f57283eedd1bd049.json", "RE1")
match_paper(papers / "reneet_2026_6a2a77d8550bcd9e69612003.json", "RE8")
# peek image in 2021
j = json.loads((papers / "neet_2021_67efd9e85c97f0fe143c83cd.json").read_text(encoding="utf-8"))
for sec in j["data"]["testData"]["sections"]:
    for q in sec["questions"]:
        qq = q.get("question") or {}
        blob = str(qq)
        if qq.get("image") or "<img" in blob.lower() or q.get("imageBaseUrl"):
            print("IMG_Q", sec["title"], q.get("imageBaseUrl"), qq.get("image"), (qq.get("text") or "")[:80])
            break
